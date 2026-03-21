"""
backend/dialer/complete_call.py
─────────────────────────────────
Completes a call and logs the outcome.
v1: core functionality only (no WhatsApp).
WhatsApp integration available when API key is configured.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()


class CompleteCallRequest(BaseModel):
    contact_id: str
    campaign_id: str
    outcome: str
    duration_sec: Optional[int] = None
    notes: Optional[str] = None
    callback_at: Optional[str] = None
    script_path: Optional[list] = None
    street_verified: Optional[str] = None
    city_verified: Optional[str] = None
    postal_code_verified: Optional[str] = None


VALID_OUTCOMES = {
    "interested", "callback", "not_interested",
    "voicemail", "wrong_number", "dnc", "no_answer",
}

OUTCOME_STATUS = {
    "interested":      "called",
    "not_interested":  "called",
    "wrong_number":    "called",
    "no_answer":       "available",
    "voicemail":       "available",
    "callback":        "callback",
    "dnc":             "dnc",
}


@router.post("/complete-call")
async def complete_call(
    body: CompleteCallRequest,
    agent: AgentContext = Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    if body.outcome not in VALID_OUTCOMES:
        raise HTTPException(400, f"Invalid outcome: {body.outcome}")

    # Verify contact exists and is locked by this agent
    row = db.table("contacts") \
        .select("locked_by, phone, first_name, org_id, call_count") \
        .eq("id", body.contact_id) \
        .single() \
        .execute()

    if not row.data:
        raise HTTPException(404, "Contact not found")

    if row.data["locked_by"] != agent.id:
        raise HTTPException(403, "Lock not held")

    contact = row.data
    new_status = OUTCOME_STATUS.get(body.outcome, "called")
    current_call_count = contact.get("call_count", 0) or 0
    now_iso = datetime.now(timezone.utc).isoformat()

    # Build update payload
    upd = {
        "locked_by":       None,
        "locked_at":       None,
        "lock_expires_at": None,
        "status":          new_status,
        "last_called_at":  now_iso,
        "last_outcome":    body.outcome,
        "called_by":       agent.id,
        "call_count":      current_call_count + 1,
        "callback_at":     body.callback_at if body.outcome == "callback" else None,
    }

    # Add verified address if provided
    if body.street_verified:
        upd.update({
            "street_verified":      body.street_verified,
            "city_verified":        body.city_verified,
            "postal_code_verified": body.postal_code_verified,
            "address_verified_at":  now_iso,
            "address_verified_by":  agent.id,
        })

    db.table("contacts").update(upd).eq("id", body.contact_id).execute()

    # If marked as DNC, add to DNC list
    if body.outcome == "dnc":
        try:
            db.table("dnc_list").upsert({
                "org_id":   agent.org_id,
                "phone":    contact["phone"],
                "reason":   "Agent marked",
                "added_by": agent.id,
            }).execute()
        except Exception as e:
            print(f"[complete-call] DNC upsert error (non-fatal): {e}")

    # Log the call
    try:
        db.table("call_logs").insert({
            "org_id":       agent.org_id,
            "contact_id":   body.contact_id,
            "agent_id":     agent.id,
            "campaign_id":  body.campaign_id,
            "outcome":      body.outcome,
            "duration_sec": body.duration_sec,
            "notes":        body.notes,
            "script_path":  body.script_path,
            "ended_at":     now_iso,
        }).execute()
    except Exception as e:
        print(f"[complete-call] Call log insert error (non-fatal): {e}")

    # WhatsApp follow-up (v2 — only if configured)
    wa = {"sent": False, "reason": "WhatsApp not configured"}
    try:
        import os
        if os.getenv("WHATSAPP_360DIALOG_KEY") and os.getenv("WHATSAPP_360DIALOG_KEY") != "placeholder":
            from integrations.whatsapp import send_followup
            sp = db.table("savings_pages") \
                .select("url") \
                .eq("contact_id", body.contact_id) \
                .order("created_at", desc=True) \
                .limit(1) \
                .maybe_single() \
                .execute()
            savings_url = sp.data["url"] if sp and sp.data else ""
            calendar_url = f"https://app.solarflowpro.com/book/{agent.id}"
            wa = await send_followup(
                outcome=body.outcome,
                contact=contact,
                savings_url=savings_url,
                calendar_url=calendar_url,
            )
    except Exception as e:
        print(f"[complete-call] WhatsApp error (non-fatal): {e}")
        wa = {"sent": False, "reason": str(e)}

    return {
        "status":         "ok",
        "outcome":        body.outcome,
        "new_status":     new_status,
        "address_saved":  bool(body.street_verified),
        "whatsapp":       wa,
    }