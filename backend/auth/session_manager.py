"""
backend/auth/session_manager.py
─────────────────────────────────
Login, logout, and token refresh endpoints.
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
    try:
        response = db.auth.sign_in_with_password({
            "email":    body.email,
            "password": body.password,
        })
    except Exception:
        raise HTTPException(401, "Invalid email or password")

    user    = response.user
    session = response.session

    profile = db.table("user_profiles")\
        .select("role, full_name, org_id, is_platform_admin, organizations(name, plan, trial_ends_at, contact_interval_sec)")\
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
            "id":                   user.id,
            "email":                user.email,
            "full_name":            p["full_name"],
            "role":                 p["role"],
            "org_id":               p["org_id"],
            "org_name":             org["name"],
            "plan":                 org["plan"],
            "trial_ends_at":        org.get("trial_ends_at"),
            "contact_interval_sec": org.get("contact_interval_sec", 45),
            "is_platform_admin":    p.get("is_platform_admin", False),
        }
    }


@router.post("/signup")
async def signup(body: SignupRequest, db=Depends(get_supabase)):
    # Create auth user
    try:
        auth_response = db.auth.sign_up({
            "email":    body.email,
            "password": body.password,
        })
        user = auth_response.user
    except Exception as e:
        raise HTTPException(400, f"Signup failed: {str(e)}")

    # Create organization with 7-day trial
    org = db.table("organizations").insert({
        "name":    body.org_name,
        "country": body.country,
        "plan":    "trial",
    }).execute()

    org_id = org.data[0]["id"]

    # Create user profile as AGENT
    db.table("user_profiles").insert({
        "id":        user.id,
        "org_id":    org_id,
        "role":      "agent",
        "full_name": body.full_name,
    }).execute()

    return {
        "message":    "Trial account created. Welcome to SolarFlow Pro.",
        "org_id":     org_id,
        "plan":       "trial",
        "trial_days": 7,
    }


@router.post("/refresh")
async def refresh_token(refresh_token: str, db=Depends(get_supabase)):
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
    db.auth.sign_out()
    return {"message": "Logged out successfully"}
