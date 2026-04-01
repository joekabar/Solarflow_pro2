"""
backend/campaigns/campaigns_api.py
────────────────────────────────────
Campaign CRUD with team scoping and all Adversus IQ5 settings.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()


class CampaignCreate(BaseModel):
    name:                   str
    dial_mode:              Literal["preview", "power", "manual"] = "preview"
    team_id:                Optional[str] = None
    script_id:              Optional[str] = None
    max_attempts:           int = 5
    max_attempts_redial:    int = 10
    timezone:               str = "Europe/Brussels"
    calling_hours_start:    str = "09:00"
    calling_hours_end:      str = "20:00"
    contact_interval_sec:   Optional[int] = None
    max_ring_time:          int = 30
    countdown_active:       bool = False
    countdown_duration_sec: int = 5
    pause_on_invalid_call:  bool = False
    private_redial_default: bool = True
    caller_id:              Optional[str] = None
    recording_mode:         Literal["always", "never", "on_demand", "on_activated"] = "always"


class CampaignUpdate(CampaignCreate):
    name: Optional[str] = None


# ── List campaigns ────────────────────────────────────────────

@router.get("")
async def list_campaigns(
    agent: AgentContext = Depends(require_role("admin", "supervisor", "agent")),
    db=Depends(get_supabase),
):
    q = db.table("campaigns").select("*, teams(name)").eq("org_id", agent.org_id)

    # Agents and supervisors only see their team's campaigns
    if agent.role in ("supervisor", "agent") and agent.team_id:
        q = q.eq("team_id", agent.team_id)

    result = q.order("created_at", desc=True).execute()
    return result.data


# ── Get single campaign ───────────────────────────────────────

@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin", "supervisor", "agent")),
    db=Depends(get_supabase),
):
    result = db.table("campaigns")\
        .select("*, teams(name), scripts(name)")\
        .eq("id", campaign_id)\
        .eq("org_id", agent.org_id)\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(404, "Campaign not found")
    return result.data


# ── Create campaign ───────────────────────────────────────────

@router.post("")
async def create_campaign(
    body:  CampaignCreate,
    agent: AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    result = db.table("campaigns").insert({
        "org_id":                 agent.org_id,
        "team_id":                body.team_id,
        "script_id":              body.script_id,
        "name":                   body.name,
        "dial_mode":              body.dial_mode,
        "max_attempts":           body.max_attempts,
        "max_attempts_redial":    body.max_attempts_redial,
        "timezone":               body.timezone,
        "calling_hours_start":    body.calling_hours_start,
        "calling_hours_end":      body.calling_hours_end,
        "contact_interval_sec":   body.contact_interval_sec,
        "max_ring_time":          body.max_ring_time,
        "countdown_active":       body.countdown_active,
        "countdown_duration_sec": body.countdown_duration_sec,
        "pause_on_invalid_call":  body.pause_on_invalid_call,
        "private_redial_default": body.private_redial_default,
        "caller_id":              body.caller_id,
        "recording_mode":         body.recording_mode,
    }).execute()
    return result.data[0]


# ── Update campaign ───────────────────────────────────────────

@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    body:        CampaignUpdate,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    result = db.table("campaigns")\
        .update(upd)\
        .eq("id", campaign_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    if not result.data:
        raise HTTPException(404, "Campaign not found")
    return result.data[0]


# ── Pause / Resume campaign ───────────────────────────────────

@router.post("/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    db.table("campaigns")\
        .update({"status": "paused"})\
        .eq("id", campaign_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    return {"status": "paused"}


@router.post("/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    db.table("campaigns")\
        .update({"status": "active"})\
        .eq("id", campaign_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    return {"status": "active"}


# ── Delete campaign ───────────────────────────────────────────

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    db.table("campaigns")\
        .delete()\
        .eq("id", campaign_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    return {"status": "ok"}


# ── Campaign stats (contact queue summary) ────────────────────

@router.get("/{campaign_id}/stats")
async def campaign_stats(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin", "supervisor", "agent")),
    db=Depends(get_supabase),
):
    result = db.table("contacts")\
        .select("status")\
        .eq("org_id", agent.org_id)\
        .eq("campaign_id", campaign_id)\
        .execute()

    counts: dict = {}
    for row in (result.data or []):
        s = row["status"]
        counts[s] = counts.get(s, 0) + 1

    return {
        "total":    sum(counts.values()),
        "by_status": counts,
    }
