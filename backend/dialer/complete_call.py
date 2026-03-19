"""
backend/dialer/complete_call.py  [v2 — replaces v1 version]
Adds WhatsApp auto-send + savings page lookup after every call.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from integrations.whatsapp import send_followup
from db import get_supabase

router = APIRouter()

class CompleteCallRequest(BaseModel):
    contact_id: str; campaign_id: str; outcome: str
    duration_sec: Optional[int]=None; notes: Optional[str]=None
    callback_at: Optional[str]=None; script_path: Optional[list]=None
    street_verified: Optional[str]=None; city_verified: Optional[str]=None
    postal_code_verified: Optional[str]=None

VALID_OUTCOMES={"interested","callback","not_interested","voicemail","wrong_number","dnc","no_answer"}
OUTCOME_STATUS={"interested":"called","not_interested":"called","wrong_number":"called",
                "no_answer":"available","voicemail":"available","callback":"callback","dnc":"dnc"}

@router.post("/complete-call")
async def complete_call(body: CompleteCallRequest,
    agent: AgentContext=Depends(require_role("agent","supervisor","admin")),
    db=Depends(get_supabase)):
    if body.outcome not in VALID_OUTCOMES:
        raise HTTPException(400, f"Invalid outcome: {body.outcome}")
    row = db.table("contacts").select("locked_by,phone,first_name,org_id")\
        .eq("id",body.contact_id).single().execute()
    if not row.data: raise HTTPException(404,"Contact not found")
    if row.data["locked_by"]!=agent.id: raise HTTPException(403,"Lock not held")
    contact=row.data; new_status=OUTCOME_STATUS[body.outcome]
    upd={"locked_by":None,"locked_at":None,"lock_expires_at":None,
         "status":new_status,"last_called_at":"now()","last_outcome":body.outcome,
         "called_by":agent.id,"call_count":"call_count + 1",
         "callback_at":body.callback_at if body.outcome=="callback" else None}
    if body.street_verified:
        upd.update({"street_verified":body.street_verified,"city_verified":body.city_verified,
                    "postal_code_verified":body.postal_code_verified,
                    "address_verified_at":"now()","address_verified_by":agent.id})
    db.table("contacts").update(upd).eq("id",body.contact_id).execute()
    if body.outcome=="dnc":
        db.table("dnc_list").upsert({"org_id":agent.org_id,"phone":contact["phone"],
            "reason":"Agent marked","added_by":agent.id}).execute()
    # v2: savings page + WhatsApp
    sp=db.table("savings_pages").select("url").eq("contact_id",body.contact_id)\
        .order("created_at",desc=True).limit(1).maybe_single().execute()
    savings_url=sp.data["url"] if sp.data else ""
    calendar_url=f"https://app.solarflowpro.com/book/{agent.id}"
    wa=await send_followup(outcome=body.outcome,contact=contact,
        savings_url=savings_url,calendar_url=calendar_url)
    db.table("call_logs").insert({"org_id":agent.org_id,"contact_id":body.contact_id,
        "agent_id":agent.id,"campaign_id":body.campaign_id,"outcome":body.outcome,
        "duration_sec":body.duration_sec,"notes":body.notes,"script_path":body.script_path,
        "whatsapp_sent":wa.get("sent",False),"ended_at":"now()"}).execute()
    return {"status":"ok","outcome":body.outcome,"new_status":new_status,
            "address_saved":bool(body.street_verified),"whatsapp":wa}
