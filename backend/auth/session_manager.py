"""
backend/auth/session_manager.py
─────────────────────────────────
Login, logout, and token refresh endpoints.
Supabase handles the actual auth — we just expose clean API routes.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from db import get_supabase

router = APIRouter()


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class SignupRequest(BaseModel):
    email:      EmailStr
    password:   str
    full_name:  str
    org_name:   str
    country:    str = "BE"


@router.post("/login")
async def login(body: LoginRequest, db=Depends(get_supabase)):
    """
    Authenticates the user with Supabase Auth.
    Returns a JWT access token + the user's role and org info.
    The frontend stores this token and sends it as 'Bearer <token>'
    on every subsequent request.
    """
    try:
        response = db.auth.sign_in_with_password({
            "email":    body.email,
            "password": body.password,
        })
    except Exception:
        raise HTTPException(401, "Invalid email or password")

    user    = response.user
    session = response.session

    # Load role + org for the frontend to use immediately
    profile = db.table("user_profiles")\
        .select("role, full_name, org_id, organizations(name, plan, trial_ends_at, contact_interval_sec)")\
        .eq("id", user.id)\
        .single()\
        .execute()

    if not profile.data:
        raise HTTPException(403, "Account not fully set up — contact support")

    p   = profile.data
    org = p["organizations"]

    return {
        "access_token":  session.access_token,
        "refresh_token": session.refresh_token,
        "user": {
            "id":        user.id,
            "email":     user.email,
            "full_name": p["full_name"],
            "role":      p["role"],
            "org_id":    p["org_id"],
            "org_name":  org["name"],
            "plan":      org["plan"],
            "trial_ends_at":     org.get("trial_ends_at"),
            "contact_interval_sec": org.get("contact_interval_sec", 45),
        }
    }


@router.post("/signup")
async def signup(body: SignupRequest, db=Depends(get_supabase)):
    """
    Creates a new trial account.
    1. Creates Supabase auth user
    2. Creates organization (trial plan, 7-day expiry)
    3. Creates user_profile as admin
    No credit card required.
    """
    # 1. Create auth user
    try:
        auth_response = db.auth.sign_up({
            "email":    body.email,
            "password": body.password,
        })
        user = auth_response.user
    except Exception as e:
        raise HTTPException(400, f"Signup failed: {str(e)}")

    # 2. Create organization with 7-day trial
    org = db.table("organizations").insert({
        "name":    body.org_name,
        "country": body.country,
        "plan":    "trial",
        # trial_ends_at defaults to now() + 7 days in schema
    }).execute()

    org_id = org.data[0]["id"]

    # 3. Create user profile as admin of their own org
    db.table("user_profiles").insert({
        "id":        user.id,
        "org_id":    org_id,
        "role":      "admin",
        "full_name": body.full_name,
    }).execute()

    return {
        "message":  "Trial account created. Welcome to SolarFlow Pro.",
        "org_id":   org_id,
        "plan":     "trial",
        "trial_days": 7,
    }


@router.post("/refresh")
async def refresh_token(refresh_token: str, db=Depends(get_supabase)):
    """
    Silently refreshes an expired access token.
    Called automatically by the frontend before the token expires (every 55 min).
    """
    try:
        response = db.auth.refresh_session(refresh_token)
        return {
            "access_token":  response.session.access_token,
            "refresh_token": response.session.refresh_token,
        }
    except Exception:
        raise HTTPException(401, "Refresh token invalid or expired — please log in again")


@router.post("/logout")
async def logout(db=Depends(get_supabase)):
    """Signs out the current session."""
    db.auth.sign_out()
    return {"message": "Logged out successfully"}
