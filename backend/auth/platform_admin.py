"""
backend/auth/platform_admin.py
────────────────────────────────
Super admin endpoints for the SolarFlow Pro platform owner.
Manages all organizations, users, trials, and can impersonate any user.

Only accessible by users with is_platform_admin = true.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from auth.jwt_validator import get_current_agent, AgentContext
from db import get_supabase

router = APIRouter()


# ── Platform admin guard ─────────────────────────────────────
async def require_platform_admin(
    authorization: str = Header(..., description="Bearer <jwt>"),
) -> AgentContext:
    """Validates JWT and checks is_platform_admin flag."""
    agent = await get_current_agent(authorization)

    db = get_supabase()
    try:
        result = db.table("user_profiles") \
            .select("is_platform_admin") \
            .eq("id", agent.id) \
            .execute()
        if not result.data or not result.data[0].get("is_platform_admin"):
            raise HTTPException(403, "Geen platform admin rechten")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[platform_admin] Auth check error: {e}")
        raise HTTPException(403, "Geen platform admin rechten")

    return agent


# ── Organizations ────────────────────────────────────────────

@router.get("/platform/organizations")
async def list_organizations(
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """List all organizations with user counts and contact counts."""
    try:
        orgs = db.table("organizations").select("*").order("created_at", desc=True).execute()

        result = []
        for org in (orgs.data or []):
            # Count users
            try:
                users = db.table("user_profiles").select("id", count="exact") \
                    .eq("org_id", org["id"]).execute()
                user_count = len(users.data) if users.data else 0
            except Exception:
                user_count = 0

            # Count contacts
            try:
                contacts = db.table("contacts").select("id", count="exact") \
                    .eq("org_id", org["id"]).execute()
                contact_count = len(contacts.data) if contacts.data else 0
            except Exception:
                contact_count = 0

            # Count campaigns
            try:
                campaigns = db.table("campaigns").select("id", count="exact") \
                    .eq("org_id", org["id"]).execute()
                campaign_count = len(campaigns.data) if campaigns.data else 0
            except Exception:
                campaign_count = 0

            result.append({
                **org,
                "user_count": user_count,
                "contact_count": contact_count,
                "campaign_count": campaign_count,
            })

        return {"organizations": result}
    except Exception as e:
        print(f"[platform_admin] List orgs error: {e}")
        raise HTTPException(500, "Fout bij ophalen organisaties")


@router.put("/platform/organizations/{org_id}")
async def update_organization(
    org_id: str,
    body: dict,
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """Update any org — plan, trial, active status."""
    allowed_fields = {"plan", "is_active", "trial_ends_at", "seat_limit", "contact_interval_sec", "name"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}

    if not updates:
        raise HTTPException(400, "Geen geldige velden")

    try:
        result = db.table("organizations").update(updates).eq("id", org_id).execute()
        return {"status": "ok", "organization": result.data[0] if result.data else None}
    except Exception as e:
        print(f"[platform_admin] Update org error: {e}")
        raise HTTPException(500, "Bijwerken mislukt")


# ── Users ────────────────────────────────────────────────────

@router.get("/platform/users")
async def list_all_users(
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """List ALL users across ALL organizations."""
    try:
        users = db.table("user_profiles") \
            .select("*, organizations(name, plan)") \
            .order("created_at", desc=True) \
            .execute()
        return {"users": users.data or []}
    except Exception as e:
        print(f"[platform_admin] List users error: {e}")
        raise HTTPException(500, "Fout bij ophalen gebruikers")


@router.put("/platform/users/{user_id}")
async def update_any_user(
    user_id: str,
    body: dict,
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """Update any user — role, active status, platform admin flag."""
    allowed_fields = {"role", "is_active", "is_platform_admin", "full_name"}
    updates = {k: v for k, v in body.items() if k in allowed_fields}

    if not updates:
        raise HTTPException(400, "Geen geldige velden")

    try:
        result = db.table("user_profiles").update(updates).eq("id", user_id).execute()
        return {"status": "ok", "user": result.data[0] if result.data else None}
    except Exception as e:
        print(f"[platform_admin] Update user error: {e}")
        raise HTTPException(500, "Bijwerken mislukt")


# ── Trial management ─────────────────────────────────────────

class ExtendTrialRequest(BaseModel):
    days: int = 7


@router.post("/platform/organizations/{org_id}/extend-trial")
async def extend_trial(
    org_id: str,
    body: ExtendTrialRequest,
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """Extend or reset an org's trial period."""
    try:
        # Get current trial end
        org = db.table("organizations").select("trial_ends_at, plan").eq("id", org_id).execute()
        if not org.data:
            raise HTTPException(404, "Organisatie niet gevonden")

        current_end = org.data[0].get("trial_ends_at")
        if current_end:
            try:
                end_dt = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
            except Exception:
                end_dt = datetime.now(timezone.utc)
        else:
            end_dt = datetime.now(timezone.utc)

        # If trial already expired, extend from now
        if end_dt < datetime.now(timezone.utc):
            end_dt = datetime.now(timezone.utc)

        new_end = end_dt + timedelta(days=body.days)

        db.table("organizations").update({
            "trial_ends_at": new_end.isoformat(),
            "plan": "trial",
            "is_active": True,
        }).eq("id", org_id).execute()

        return {
            "status": "ok",
            "new_trial_ends_at": new_end.isoformat(),
            "days_added": body.days,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[platform_admin] Extend trial error: {e}")
        raise HTTPException(500, "Trial verlengen mislukt")


# ── Impersonate ──────────────────────────────────────────────

@router.post("/platform/impersonate/{user_id}")
async def impersonate_user(
    user_id: str,
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """
    Generate login credentials for any user.
    Returns the user's profile so the frontend can switch context.
    Note: actual JWT impersonation requires Supabase admin API.
    For now, returns user info for the frontend to display.
    """
    try:
        profile = db.table("user_profiles") \
            .select("*, organizations(name, plan, trial_ends_at, contact_interval_sec)") \
            .eq("id", user_id) \
            .execute()

        if not profile.data:
            raise HTTPException(404, "Gebruiker niet gevonden")

        p = profile.data[0]
        org = p.get("organizations", {})

        return {
            "status": "ok",
            "user": {
                "id": p["id"],
                "full_name": p.get("full_name", ""),
                "role": p["role"],
                "org_id": p["org_id"],
                "org_name": org.get("name", ""),
                "plan": org.get("plan", ""),
                "is_platform_admin": p.get("is_platform_admin", False),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[platform_admin] Impersonate error: {e}")
        raise HTTPException(500, "Impersonatie mislukt")


# ── Platform stats ───────────────────────────────────────────

@router.get("/platform/stats")
async def platform_stats(
    admin: AgentContext = Depends(require_platform_admin),
    db=Depends(get_supabase),
):
    """Platform-wide statistics dashboard."""
    try:
        orgs = db.table("organizations").select("id, plan, is_active").execute()
        users = db.table("user_profiles").select("id, role, is_active").execute()
        contacts = db.table("contacts").select("id, status").execute()
        calls = db.table("call_logs").select("id, outcome").execute()

        org_data = orgs.data or []
        user_data = users.data or []
        contact_data = contacts.data or []
        call_data = calls.data or []

        # Org stats
        total_orgs = len(org_data)
        active_orgs = sum(1 for o in org_data if o.get("is_active"))
        trial_orgs = sum(1 for o in org_data if o.get("plan") == "trial")
        paid_orgs = sum(1 for o in org_data if o.get("plan") in ("starter", "pro", "enterprise"))

        # User stats
        total_users = len(user_data)
        active_users = sum(1 for u in user_data if u.get("is_active"))
        agents = sum(1 for u in user_data if u.get("role") == "agent")
        admins = sum(1 for u in user_data if u.get("role") == "admin")

        # Contact stats
        total_contacts = len(contact_data)
        available = sum(1 for c in contact_data if c.get("status") == "available")
        called = sum(1 for c in contact_data if c.get("status") == "called")
        callbacks = sum(1 for c in contact_data if c.get("status") == "callback")

        # Call stats
        total_calls = len(call_data)
        interested = sum(1 for c in call_data if c.get("outcome") == "interested")
        not_interested = sum(1 for c in call_data if c.get("outcome") == "not_interested")

        return {
            "organizations": {
                "total": total_orgs, "active": active_orgs,
                "trial": trial_orgs, "paid": paid_orgs,
            },
            "users": {
                "total": total_users, "active": active_users,
                "agents": agents, "admins": admins,
            },
            "contacts": {
                "total": total_contacts, "available": available,
                "called": called, "callbacks": callbacks,
            },
            "calls": {
                "total": total_calls, "interested": interested,
                "not_interested": not_interested,
                "conversion_rate": round(interested / max(total_calls, 1) * 100, 1),
            },
        }
    except Exception as e:
        print(f"[platform_admin] Stats error: {e}")
        raise HTTPException(500, "Stats ophalen mislukt")
