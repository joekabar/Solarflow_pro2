"""
backend/dialer/next_contact.py
────────────────────────────────
The core dialer endpoint. Returns exactly one contact to the agent.

What this does in order:
  1. Enforce rate limit (45s default, configurable)
  2. Check calling hours for this campaign
  3. Release any stale lock from a previous crash
  4. Call the atomic PostgreSQL lock function (FOR UPDATE SKIP LOCKED)
  5. Skip DNC contacts automatically
  6. Write to the audit log
  7. Return the contact with address stripped for agents
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from contacts.serializer import serialize_contact
from compliance.dnc import is_on_dnc
from dialer.rate_limiter import enforce_rate_limit
from db import get_supabase

router = APIRouter()


class NextContactRequest(BaseModel):
    campaign_id: str


@router.post("/next-contact")
async def get_next_contact(
    body:  NextContactRequest,
    agent: AgentContext = Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    """
    Returns the next available contact for this agent.

    Called when:
    - Agent clicks "Next contact" (manual mode)
    - Power dialer auto-requests after wrap-up
    - Preview dialer loads the next contact card
    """

    # ── 1. Rate limit check ──────────────────────────────────
    await enforce_rate_limit(
        agent_id=agent.id,
        campaign_id=body.campaign_id,
        org_interval=agent.org_interval_sec,
        db=db,
    )

    # ── 2. Calling hours check ───────────────────────────────
    _check_calling_hours(body.campaign_id, db)

    # ── 3. Release stale lock from this agent ────────────────
    # If agent had a contact locked but never logged a call outcome
    # (browser closed, network drop, etc.), release it now
    await _release_agent_lock(agent.id, db)

    # ── 4. Atomic lock — FOR UPDATE SKIP LOCKED ──────────────
    # This PostgreSQL function is concurrency-safe.
    # Two agents calling this simultaneously always get different contacts.
    result = db.rpc("get_next_contact", {
        "p_org_id":      agent.org_id,
        "p_agent_id":    agent.id,
        "p_campaign_id": body.campaign_id,
    }).execute()

    if not result.data:
        return {
            "status":  "queue_empty",
            "contact": None,
            "message": "No contacts available in this campaign right now.",
        }

    contact = result.data[0]

    # ── 5. DNC auto-skip ─────────────────────────────────────
    # Check against the org's DNC list.
    # If on DNC, mark and recurse to get the next one.
    # Max 10 DNC skips per request to avoid infinite loops.
    max_dnc_skips = 10
    skips = 0
    while skips < max_dnc_skips:
        if not await is_on_dnc(contact["phone"], agent.org_id, db):
            break
        # Mark this contact as DNC and get the next
        db.table("contacts")\
            .update({"status": "dnc", "locked_by": None,
                     "locked_at": None, "lock_expires_at": None})\
            .eq("id", contact["id"])\
            .execute()

        result = db.rpc("get_next_contact", {
            "p_org_id":      agent.org_id,
            "p_agent_id":    agent.id,
            "p_campaign_id": body.campaign_id,
        }).execute()

        if not result.data:
            return {"status": "queue_empty", "contact": None}

        contact = result.data[0]
        skips += 1

    # ── 6. Audit log ─────────────────────────────────────────
    db.table("contact_view_log").insert({
        "org_id":      agent.org_id,
        "contact_id":  contact["id"],
        "agent_id":    agent.id,
        "campaign_id": body.campaign_id,
    }).execute()

    # ── 7. Serialize (strip address for agents) ───────────────
    return {
        "status":  "ok",
        "contact": serialize_contact(contact, agent),
    }


def _check_calling_hours(campaign_id: str, db) -> None:
    try:
        result = db.table("campaigns") \
            .select("calling_hours_start, calling_hours_end, country") \
            .eq("id", campaign_id) \
            .execute()

        if not result or not result.data:
            return

        campaign_data = result.data[0]
    except Exception as e:
        print(f"[calling_hours] Error reading campaign: {e}")
        return

    now_utc = datetime.now(timezone.utc)
    now_time = now_utc.strftime("%H:%M")

    start = campaign_data.get("calling_hours_start", "09:00")
    end = campaign_data.get("calling_hours_end", "20:00")

    # Handle time format with seconds (09:00:00 → 09:00)
    if start and len(start) > 5:
        start = start[:5]
    if end and len(end) > 5:
        end = end[:5]

    if not (start <= now_time <= end):
        raise HTTPException(
            403,
            {
                "error": "outside_calling_hours",
                "message": f"Bellen is alleen toegestaan tussen {start} en {end}.",
                "current_time": now_time,
            }
        )


async def _release_agent_lock(agent_id: str, db) -> None:
    try:
        db.table("contacts").update({
            "locked_by": None,
            "locked_at": None,
            "lock_expires_at": None,
            "status": "available",
        }).eq("locked_by", agent_id).eq("status", "locked").execute()
    except Exception as e:
        print(f"[release_lock] Error: {e}")
        
    """
    Returns any locked-but-not-called contacts back to 'available'.
    This handles browser crashes and network drops gracefully.
    """
    db.table("contacts").update({
        "locked_by":       None,
        "locked_at":       None,
        "lock_expires_at": None,
        "status":          "available",
    })\
    .eq("locked_by", agent_id)\
    .eq("status", "locked")\
    .execute()
