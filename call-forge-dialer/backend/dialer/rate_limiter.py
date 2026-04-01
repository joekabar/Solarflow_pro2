"""
backend/dialer/rate_limiter.py
────────────────────────────────
Enforces minimum wait between contacts per agent.
Set contact_interval_sec=0 on a campaign to disable.
"""

from datetime import datetime, timezone
from fastapi import HTTPException


async def get_effective_interval(campaign_id: str, org_interval: int, db) -> int:
    try:
        r = db.table("campaigns")\
            .select("contact_interval_sec")\
            .eq("id", campaign_id)\
            .execute()
        if r and r.data:
            val = r.data[0].get("contact_interval_sec")
            if val is not None:
                return val
    except Exception as e:
        print(f"[rate_limit] Error reading campaign: {e}")
    return org_interval if org_interval is not None else 45


async def check_rate_limit(agent_id: str, campaign_id: str, org_interval: int, db) -> dict:
    interval = await get_effective_interval(campaign_id, org_interval, db)
    if interval == 0:
        return {"can_proceed": True, "wait_seconds": 0, "interval": 0}

    try:
        r = db.table("contact_view_log")\
            .select("viewed_at")\
            .eq("agent_id", agent_id)\
            .eq("campaign_id", campaign_id)\
            .order("viewed_at", desc=True)\
            .limit(1)\
            .execute()
    except Exception as e:
        print(f"[rate_limit] View log error: {e}")
        return {"can_proceed": True, "wait_seconds": 0, "interval": interval}

    if not r or not r.data:
        return {"can_proceed": True, "wait_seconds": 0, "interval": interval}

    try:
        last = datetime.fromisoformat(r.data[0]["viewed_at"].replace("Z", "+00:00"))
        wait = interval - (datetime.now(timezone.utc) - last).total_seconds()
    except Exception:
        return {"can_proceed": True, "wait_seconds": 0, "interval": interval}

    if wait <= 0:
        return {"can_proceed": True, "wait_seconds": 0, "interval": interval}
    return {"can_proceed": False, "wait_seconds": round(wait, 1), "interval": interval}


async def enforce_rate_limit(agent_id: str, campaign_id: str, org_interval: int, db):
    result = await check_rate_limit(agent_id, campaign_id, org_interval, db)
    if not result["can_proceed"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error":        "rate_limited",
                "wait_seconds": result["wait_seconds"],
                "interval_sec": result["interval"],
                "message":      f"Wacht {result['wait_seconds']}s voor het volgende contact.",
            },
            headers={"Retry-After": str(result["wait_seconds"])},
        )
