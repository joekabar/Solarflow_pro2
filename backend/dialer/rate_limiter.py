"""
backend/dialer/rate_limiter.py
────────────────────────────────
Enforces the minimum wait between contacts per agent.

Default: 45 seconds (configurable per org and per campaign).
Range:   0 seconds (no limit) to 3600 seconds (1 hour).
Set to 0 to disable rate limiting entirely.

The interval can be changed:
  1. Per org:      organizations.contact_interval_sec
  2. Per campaign: campaigns.contact_interval_sec (overrides org)
  3. Both editable in the Admin Panel without code changes.
"""

from datetime import datetime, timezone
from fastapi import HTTPException
from db import get_supabase


async def get_effective_interval(
    campaign_id: str,
    org_interval: int,
    db,
) -> int:
    """
    Returns the effective rate limit interval in seconds.
    Campaign-level setting overrides org-level.
    Falls back to org default, then to 45s hardcoded default.
    Returns 0 if rate limiting is disabled.
    """
    campaign = db.table("campaigns")\
        .select("contact_interval_sec")\
        .eq("id", campaign_id)\
        .maybe_single()\
        .execute()

    if campaign.data and campaign.data.get("contact_interval_sec") is not None:
        return campaign.data["contact_interval_sec"]

    return org_interval if org_interval is not None else 45


async def check_rate_limit(
    agent_id:    str,
    campaign_id: str,
    org_interval: int,
    db,
) -> dict:
    """
    Checks whether the agent can request their next contact.

    Returns:
        {"can_proceed": True,  "wait_seconds": 0}
        {"can_proceed": False, "wait_seconds": 32.4}
    """
    interval = await get_effective_interval(campaign_id, org_interval, db)

    # If interval is 0, rate limiting is disabled
    if interval == 0:
        return {"can_proceed": True, "wait_seconds": 0, "interval": 0}

    # Find this agent's most recent contact view for this campaign
    last = db.table("contact_view_log")\
        .select("viewed_at")\
        .eq("agent_id", agent_id)\
        .eq("campaign_id", campaign_id)\
        .order("viewed_at", desc=True)\
        .limit(1)\
        .execute()

    if not last.data:
        # No previous calls — agent can proceed immediately
        return {"can_proceed": True, "wait_seconds": 0, "interval": interval}

    last_viewed = datetime.fromisoformat(
        last.data[0]["viewed_at"].replace("Z", "+00:00")
    )
    now     = datetime.now(timezone.utc)
    elapsed = (now - last_viewed).total_seconds()
    wait    = interval - elapsed

    if wait <= 0:
        return {"can_proceed": True, "wait_seconds": 0, "interval": interval}

    return {
        "can_proceed":  False,
        "wait_seconds": round(wait, 1),
        "interval":     interval,
    }


async def enforce_rate_limit(
    agent_id:    str,
    campaign_id: str,
    org_interval: int,
    db,
):
    """
    Raises HTTP 429 if the agent is requesting too fast.
    The Retry-After header tells the frontend exactly how long to wait.
    The frontend shows a countdown on the Next Contact button.
    """
    result = await check_rate_limit(agent_id, campaign_id, org_interval, db)

    if not result["can_proceed"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error":        "rate_limited",
                "wait_seconds": result["wait_seconds"],
                "interval_sec": result["interval"],
                "message":      (
                    f"Please wait {result['wait_seconds']}s before requesting "
                    f"the next contact. Current interval: {result['interval']}s."
                ),
            },
            headers={"Retry-After": str(result["wait_seconds"])},
        )
