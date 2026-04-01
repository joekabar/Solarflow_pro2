"""
backend/reports/reports_api.py
────────────────────────────────
Call reports + exports. Team-scoped for supervisors.
"""

import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Optional

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()


@router.get("/calls")
async def get_calls(
    campaign_id: Optional[str] = None,
    agent_id:    Optional[str] = None,
    limit:       int = 100,
    offset:      int = 0,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    q = db.table("call_logs")\
        .select("*, user_profiles(full_name), contacts(first_name, last_name, phone), campaigns(name)")\
        .eq("org_id", agent.org_id)

    if agent.role == "supervisor" and agent.team_id:
        q = q.eq("team_id", agent.team_id)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    if agent_id:
        q = q.eq("agent_id", agent_id)

    result = q.order("started_at", desc=True).range(offset, offset + limit - 1).execute()
    return result.data


@router.get("/export")
async def export_calls_csv(
    campaign_id: Optional[str] = None,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    """Stream call log as CSV download."""
    q = db.table("call_logs")\
        .select("started_at, ended_at, duration_sec, outcome, notes, from_number, to_number, provider")\
        .eq("org_id", agent.org_id)

    if agent.role == "supervisor" and agent.team_id:
        q = q.eq("team_id", agent.team_id)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)

    result = q.order("started_at", desc=True).execute()
    rows   = result.data or []

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "started_at", "ended_at", "duration_sec", "outcome",
        "notes", "from_number", "to_number", "provider",
    ])
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=call_logs.csv"},
    )


@router.get("/team-stats")
async def team_stats(
    campaign_id: Optional[str] = None,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    """Aggregate call stats by agent within a team."""
    q = db.table("call_logs")\
        .select("agent_id, outcome, duration_sec, user_profiles(full_name)")\
        .eq("org_id", agent.org_id)

    if agent.role == "supervisor" and agent.team_id:
        q = q.eq("team_id", agent.team_id)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)

    result = q.execute()
    rows   = result.data or []

    stats: dict = {}
    for row in rows:
        aid  = row["agent_id"]
        name = (row.get("user_profiles") or {}).get("full_name", aid)
        if aid not in stats:
            stats[aid] = {"agent_id": aid, "full_name": name, "total_calls": 0, "outcomes": {}, "avg_duration": 0, "_durations": []}

        stats[aid]["total_calls"] += 1
        outcome = row.get("outcome", "unknown")
        stats[aid]["outcomes"][outcome] = stats[aid]["outcomes"].get(outcome, 0) + 1
        if row.get("duration_sec"):
            stats[aid]["_durations"].append(row["duration_sec"])

    for s in stats.values():
        durations = s.pop("_durations")
        s["avg_duration"] = round(sum(durations) / len(durations)) if durations else 0

    return list(stats.values())


@router.get("/campaign-stats/{campaign_id}")
async def campaign_stats(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    """Outcome funnel for a campaign."""
    result = db.table("call_logs")\
        .select("outcome")\
        .eq("org_id", agent.org_id)\
        .eq("campaign_id", campaign_id)\
        .execute()

    counts: dict = {}
    for row in (result.data or []):
        o = row.get("outcome", "unknown")
        counts[o] = counts.get(o, 0) + 1

    return {"campaign_id": campaign_id, "total": sum(counts.values()), "by_outcome": counts}
