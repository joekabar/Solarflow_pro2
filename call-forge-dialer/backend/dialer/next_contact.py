"""
backend/dialer/next_contact.py
────────────────────────────────
Core dialer endpoint. Returns exactly one contact to the agent.
Priority: vip_callback > callback_private > callback_shared > available > auto_redial
Timezone: read from campaign (default Europe/Brussels).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from zoneinfo import ZoneInfo

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
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
    # 1. Rate limit check
    await enforce_rate_limit(
        agent_id=agent.id,
        campaign_id=body.campaign_id,
        org_interval=agent.org_interval_sec,
        db=db,
    )

    # 2. Calling hours check (campaign timezone)
    _check_calling_hours(body.campaign_id, db)

    # 3. Release any stale lock held by this agent
    _release_agent_lock(agent.id, db)

    # 4. Load campaign max_attempts
    max_attempts = _get_max_attempts(body.campaign_id, db)

    # 5. Atomic lock via FOR UPDATE SKIP LOCKED
    try:
        result = db.rpc("get_next_contact", {
            "p_org_id":       agent.org_id,
            "p_agent_id":     agent.id,
            "p_campaign_id":  body.campaign_id,
            "p_max_attempts": max_attempts,
        }).execute()
    except Exception as e:
        print(f"[next_contact] RPC error: {e}")
        return {"status": "queue_empty", "contact": None, "message": "Fout bij ophalen contact."}

    if not result or not result.data:
        return {
            "status":  "queue_empty",
            "contact": None,
            "message": "Geen contacten beschikbaar in deze campagne.",
        }

    contact = result.data[0]

    # 6. DNC auto-skip (max 10 iterations to prevent infinite loop)
    for _ in range(10):
        if not _is_on_dnc(contact["phone"], agent.org_id, db):
            break
        # Mark as DNC, fetch next
        try:
            db.table("contacts").update({
                "status":          "dnc",
                "locked_by":       None,
                "locked_at":       None,
                "lock_expires_at": None,
            }).eq("id", contact["id"]).execute()
        except Exception as e:
            print(f"[next_contact] DNC update error: {e}")

        try:
            result = db.rpc("get_next_contact", {
                "p_org_id":       agent.org_id,
                "p_agent_id":     agent.id,
                "p_campaign_id":  body.campaign_id,
                "p_max_attempts": max_attempts,
            }).execute()
        except Exception:
            return {"status": "queue_empty", "contact": None}

        if not result or not result.data:
            return {"status": "queue_empty", "contact": None}
        contact = result.data[0]

    # 7. Audit log
    try:
        db.table("contact_view_log").insert({
            "org_id":      agent.org_id,
            "contact_id":  contact["id"],
            "agent_id":    agent.id,
            "campaign_id": body.campaign_id,
        }).execute()
    except Exception as e:
        print(f"[next_contact] Audit log error: {e}")

    return {
        "status":  "ok",
        "contact": _serialize_contact(contact),
    }


def _check_calling_hours(campaign_id: str, db) -> None:
    """Check if current time is within campaign calling hours."""
    try:
        result = db.table("campaigns")\
            .select("calling_hours_start, calling_hours_end, timezone")\
            .eq("id", campaign_id)\
            .execute()

        if not result or not result.data:
            return

        c = result.data[0]
    except Exception as e:
        print(f"[calling_hours] Error: {e}")
        return

    tz_name = c.get("timezone") or "Europe/Brussels"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Europe/Brussels")

    now_local = datetime.now(tz)
    now_time  = now_local.strftime("%H:%M")

    start = str(c.get("calling_hours_start", "09:00"))[:5]
    end   = str(c.get("calling_hours_end",   "20:00"))[:5]

    if not (start <= now_time <= end):
        raise HTTPException(
            403,
            {
                "error":        "outside_calling_hours",
                "message":      f"Bellen is toegestaan van {start} tot {end}. Nu is het {now_time}.",
                "current_time": now_time,
                "timezone":     tz_name,
            }
        )


def _release_agent_lock(agent_id: str, db) -> None:
    """Free any stale lock this agent holds."""
    try:
        db.table("contacts").update({
            "locked_by":       None,
            "locked_at":       None,
            "lock_expires_at": None,
            "status":          "available",
        }).eq("locked_by", agent_id).eq("status", "locked").execute()
    except Exception as e:
        print(f"[release_lock] Error: {e}")


def _get_max_attempts(campaign_id: str, db) -> int:
    try:
        r = db.table("campaigns")\
            .select("max_attempts")\
            .eq("id", campaign_id)\
            .execute()
        if r and r.data:
            return r.data[0].get("max_attempts", 5) or 5
    except Exception:
        pass
    return 5


def _is_on_dnc(phone: str, org_id: str, db) -> bool:
    """Check if phone is in org's DNC list."""
    try:
        normalised = _normalise_phone(phone)
        result = db.table("dnc_list")\
            .select("id")\
            .eq("org_id", org_id)\
            .eq("phone", normalised)\
            .execute()
        return bool(result and result.data)
    except Exception as e:
        print(f"[dnc_check] Error: {e}")
        return False


def _normalise_phone(phone: str) -> str:
    """Normalise to digits-only. Belgian 04xx → 32xxx."""
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        digits = "32" + digits[1:]
    return digits


def _serialize_contact(c: dict) -> dict:
    """Return safe contact fields for the agent workspace."""
    return {
        "id":           c["id"],
        "first_name":   c.get("first_name"),
        "last_name":    c.get("last_name"),
        "phone":        c.get("phone"),
        "email":        c.get("email"),
        "company":      c.get("company"),
        "address":      c.get("address"),
        "custom_fields": c.get("custom_fields", {}),
        "lead_score":   c.get("lead_score", 50),
        "status":       c.get("status"),
        "call_count":   c.get("call_count", 0),
        "last_outcome": c.get("last_outcome"),
        "callback_at":  c.get("callback_at"),
    }
