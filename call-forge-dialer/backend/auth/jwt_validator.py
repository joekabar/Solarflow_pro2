"""
backend/auth/jwt_validator.py
──────────────────────────────
Validates every incoming request's JWT (issued by Supabase Auth).
Loads user profile including team_id for team-scoped data access.
"""

import os
from dataclasses import dataclass
from typing import Optional
from fastapi import HTTPException, Header
from supabase import create_client

SUPABASE_URL      = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


@dataclass
class AgentContext:
    """Everything we know about the authenticated user."""
    id:                   str
    email:                str
    org_id:               str
    team_id:              Optional[str]    # None for admins without a team assignment
    role:                 str              # admin | supervisor | agent
    full_name:            str
    org_plan:             str
    org_is_active:        bool
    trial_ends_at:        Optional[str]
    org_interval_sec:     int
    trial_days_remaining: Optional[int] = None


async def get_current_agent(
    authorization: str = Header(..., description="Bearer <jwt>")
) -> AgentContext:
    """
    FastAPI dependency. Validates JWT, loads profile + team, returns AgentContext.
    Raises HTTP 401 if token invalid, 403 if profile not found.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header must be 'Bearer <token>'")

    token = authorization.split(" ", 1)[1]

    # Validate the user's JWT with anon client
    anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        user_response = anon_client.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(401, "Invalid or expired token")
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    # Load profile + org with service role client
    from db import get_supabase
    db = get_supabase()

    profile = db.table("user_profiles")\
        .select("*, organizations(*)")\
        .eq("id", user.id)\
        .single()\
        .execute()

    if not profile.data:
        raise HTTPException(403, "User profile not found — contact your admin")

    p   = profile.data
    org = p["organizations"]

    return AgentContext(
        id=p["id"],
        email=user.email,
        org_id=p["org_id"],
        team_id=p.get("team_id"),
        role=p["role"],
        full_name=p.get("full_name", ""),
        org_plan=org["plan"],
        org_is_active=org["is_active"],
        trial_ends_at=org.get("trial_ends_at"),
        org_interval_sec=org.get("contact_interval_sec", 45),
    )
