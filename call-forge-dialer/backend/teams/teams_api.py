"""
backend/teams/teams_api.py
───────────────────────────
Teams CRUD + membership management.
Teams exist within an org. Users are assigned to one team.
Campaigns are scoped to a team.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()


class TeamCreate(BaseModel):
    name: str


class TeamUpdate(BaseModel):
    name: str


class AddMemberRequest(BaseModel):
    user_id: str
    role:    Optional[str] = None  # optionally update role when adding to team


# ── List teams ────────────────────────────────────────────────

@router.get("")
async def list_teams(
    agent: AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    result = db.table("teams")\
        .select("*, user_profiles(id, full_name, role, is_active)")\
        .eq("org_id", agent.org_id)\
        .order("created_at")\
        .execute()
    return result.data


# ── Create team ───────────────────────────────────────────────

@router.post("")
async def create_team(
    body:  TeamCreate,
    agent: AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    result = db.table("teams").insert({
        "org_id": agent.org_id,
        "name":   body.name,
    }).execute()
    return result.data[0]


# ── Update team name ──────────────────────────────────────────

@router.put("/{team_id}")
async def update_team(
    team_id: str,
    body:    TeamUpdate,
    agent:   AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    result = db.table("teams")\
        .update({"name": body.name})\
        .eq("id", team_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    if not result.data:
        raise HTTPException(404, "Team not found")
    return result.data[0]


# ── Delete team ───────────────────────────────────────────────

@router.delete("/{team_id}")
async def delete_team(
    team_id: str,
    agent:   AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    # Unassign users first (ON DELETE SET NULL handles this via FK)
    db.table("teams")\
        .delete()\
        .eq("id", team_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    return {"status": "ok"}


# ── List team members ─────────────────────────────────────────

@router.get("/{team_id}/members")
async def list_members(
    team_id: str,
    agent:   AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    result = db.table("user_profiles")\
        .select("id, full_name, role, is_active, created_at")\
        .eq("org_id", agent.org_id)\
        .eq("team_id", team_id)\
        .execute()
    return result.data


# ── Add user to team ──────────────────────────────────────────

@router.post("/{team_id}/members")
async def add_member(
    team_id: str,
    body:    AddMemberRequest,
    agent:   AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    upd: dict = {"team_id": team_id}
    if body.role:
        upd["role"] = body.role

    result = db.table("user_profiles")\
        .update(upd)\
        .eq("id", body.user_id)\
        .eq("org_id", agent.org_id)\
        .execute()

    if not result.data:
        raise HTTPException(404, "User not found in this org")
    return result.data[0]


# ── Remove user from team ─────────────────────────────────────

@router.delete("/{team_id}/members/{user_id}")
async def remove_member(
    team_id: str,
    user_id: str,
    agent:   AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    db.table("user_profiles")\
        .update({"team_id": None})\
        .eq("id", user_id)\
        .eq("org_id", agent.org_id)\
        .eq("team_id", team_id)\
        .execute()
    return {"status": "ok"}


# ── List all users in org (for team assignment) ───────────────

@router.get("/users/all")
async def list_org_users(
    agent: AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    result = db.table("user_profiles")\
        .select("id, full_name, role, team_id, is_active")\
        .eq("org_id", agent.org_id)\
        .order("full_name")\
        .execute()
    return result.data
