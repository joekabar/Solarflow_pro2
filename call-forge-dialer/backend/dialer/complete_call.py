"""
backend/dialer/complete_call.py
─────────────────────────────────
Completes a call: logs outcome, updates contact status, handles appointments.
No solar-specific fields — generic for any outbound sales / appointment campaign.
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
    contact_id:              str
    campaign_id:             str
    outcome:                 str
    duration_sec:            Optional[int]   = None
    notes:                   Optional[str]   = None
    callback_at:             Optional[str]   = None
    callback_private:        bool            = True   # True=private, False=shared callback
    appointment_at:          Optional[str]   = None
    appointment_location:    Optional[str]   = None
    appointment_duration_min: Optional[int]  = 60
    script_path:             Optional[list]  = None
    from_number:             Optional[str]   = None
    to_number:               Optional[str]   = None
    call_sid:                Optional[str]   = None
    provider:                Optional[str]   = "manual"


# Valid outcomes aligned with Adversus IQ5 analysis
VALID_OUTCOMES = {
    "success",
    "vip_callback",
    "callback_private",
    "callback_shared",
    "auto_redial",
    "not_interested",
    "unqualified",
    "invalid",
    "voicemail",
    "dnc",
    "busy",
    "no_answer",
    "skip",          # agent clicked Skip without calling
}

# How each outcome maps to a contact status
OUTCOME_STATUS = {
    "success":          "success",
    "vip_callback":     "vip_callback",
    "callback_private": "callback_private",
    "callback_shared":  "callback_shared",
    "auto_redial":      "auto_redial",
    "not_interested":   "not_interested",
    "unqualified":      "unqualified",
    "invalid":          "invalid",
    "voicemail":        "voicemail",
    "dnc":              "dnc",
    "busy":             "auto_redial",   # busy → retry
    "no_answer":        "auto_redial",   # no answer → retry
    "skip":             "available",     # skipped → back to queue
}


@router.post("/complete-call")
async def complete_call(
    body:  CompleteCallRequest,
    agent: AgentContext = Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    if body.outcome not in VALID_OUTCOMES:
        raise HTTPException(400, f"Ongeldig resultaat: {body.outcome}")

    # Callback outcomes require a callback_at
    if body.outcome in ("vip_callback", "callback_private", "callback_shared"):
        if not body.callback_at:
            raise HTTPException(400, "Terugbeldatum is verplicht voor callback")

    # Success (appointment) requires appointment_at
    if body.outcome == "success" and not body.appointment_at:
        raise HTTPException(400, "Afspraakdatum is verplicht bij success")

    # Verify contact belongs to this org
    row = db.table("contacts")\
        .select("locked_by, phone, first_name, last_name, org_id, call_count, last_outcome")\
        .eq("id", body.contact_id)\
        .eq("org_id", agent.org_id)\
        .single()\
        .execute()

    if not row.data:
        raise HTTPException(404, "Contact not found")

    contact   = row.data
    locked_by = contact.get("locked_by")

    if locked_by and locked_by != agent.id:
        raise HTTPException(403, "Dit contact is vergrendeld door een andere agent")

    new_status        = OUTCOME_STATUS.get(body.outcome, "available")
    call_count        = (contact.get("call_count") or 0) + 1
    now_iso           = datetime.now(timezone.utc).isoformat()

    # Determine callback_agent_id for private callbacks
    callback_agent_id = agent.id if body.outcome == "callback_private" else None

    # Build contact update
    upd = {
        "locked_by":          None,
        "locked_at":          None,
        "lock_expires_at":    None,
        "status":             new_status,
        "last_called_at":     now_iso,
        "last_outcome":       body.outcome,
        "called_by":          agent.id,
        "call_count":         call_count,
        "callback_at":        body.callback_at if body.outcome in ("vip_callback", "callback_private", "callback_shared") else None,
        "callback_agent_id":  callback_agent_id,
    }

    db.table("contacts").update(upd).eq("id", body.contact_id).execute()

    # ── DNC → add to list ──
    if body.outcome == "dnc":
        try:
            from compliance.dnc import _normalise_phone
            db.table("dnc_list").upsert({
                "org_id":   agent.org_id,
                "phone":    _normalise_phone(contact["phone"]),
                "reason":   "Agent marked DNC during call",
                "added_by": agent.id,
            }).execute()
        except Exception as e:
            print(f"[complete_call] DNC error: {e}")

    # ── Success → create appointment ──
    appointment_result = None
    if body.outcome == "success" and body.appointment_at:
        try:
            contact_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
            appt = db.table("appointments").insert({
                "org_id":       agent.org_id,
                "team_id":      agent.team_id,
                "contact_id":   body.contact_id,
                "agent_id":     agent.id,
                "campaign_id":  body.campaign_id,
                "title":        f"Afspraak — {contact_name}",
                "scheduled_at": body.appointment_at,
                "duration_min": body.appointment_duration_min or 60,
                "location":     body.appointment_location,
                "notes":        body.notes,
                "status":       "scheduled",
            }).execute()
            appointment_result = {"created": True, "id": appt.data[0]["id"] if appt.data else None}
        except Exception as e:
            print(f"[complete_call] Appointment error: {e}")
            appointment_result = {"created": False, "error": str(e)}

    # ── Log the call ──
    try:
        db.table("call_logs").insert({
            "org_id":                agent.org_id,
            "contact_id":            body.contact_id,
            "agent_id":              agent.id,
            "campaign_id":           body.campaign_id,
            "team_id":               agent.team_id,
            "outcome":               body.outcome,
            "dial_mode":             None,   # filled by frontend if needed
            "duration_sec":          body.duration_sec,
            "notes":                 body.notes,
            "script_path":           body.script_path,
            "provider":              body.provider or "manual",
            "call_sid":              body.call_sid,
            "from_number":           body.from_number,
            "to_number":             body.to_number,
            "appointment_at":        body.appointment_at,
            "appointment_location":  body.appointment_location,
            "callback_at":           body.callback_at,
            "ended_at":              now_iso,
        }).execute()
    except Exception as e:
        print(f"[complete_call] Call log error: {e}")

    return {
        "status":      "ok",
        "outcome":     body.outcome,
        "new_status":  new_status,
        "appointment": appointment_result,
    }


@router.post("/agent-state")
async def update_agent_state(
    state: str,
    agent: AgentContext = Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    """Update agent's telephony state (for supervisor live view)."""
    valid = {"offline", "available", "on_call", "wrapup", "break"}
    if state not in valid:
        raise HTTPException(400, f"Invalid state: {state}")

    db.table("agent_telephony_state").upsert({
        "agent_id":   agent.id,
        "org_id":     agent.org_id,
        "team_id":    agent.team_id,
        "state":      state,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return {"status": "ok", "state": state}


@router.get("/agent-state")
async def get_agent_state(
    agent: AgentContext = Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    """Get current agent's telephony state."""
    result = db.table("agent_telephony_state")\
        .select("*")\
        .eq("agent_id", agent.id)\
        .execute()
    if not result.data:
        return {"state": "offline"}
    return result.data[0]
