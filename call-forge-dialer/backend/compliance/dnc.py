"""
backend/compliance/dnc.py
──────────────────────────
Do-Not-Call list management. GDPR compliant.
Belgian telemarketing: calling a DNC number = GDPR violation.
Contacts are auto-skipped in next_contact.py before shown to agent.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()


class AddDNCRequest(BaseModel):
    phone:  str
    reason: Optional[str] = None


@router.post("/dnc/add")
async def add_to_dnc(
    body:  AddDNCRequest,
    agent: AgentContext = Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    normalised = _normalise_phone(body.phone)

    db.table("dnc_list").upsert({
        "org_id":   agent.org_id,
        "phone":    normalised,
        "reason":   body.reason or "Added by agent",
        "added_by": agent.id,
    }).execute()

    # Mark any matching contact as DNC
    db.table("contacts").update({"status": "dnc"})\
        .eq("org_id", agent.org_id)\
        .eq("phone", normalised)\
        .execute()

    return {"status": "ok", "phone": normalised}


@router.get("/dnc/list")
async def get_dnc_list(
    agent: AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    result = db.table("dnc_list")\
        .select("phone, reason, added_at, user_profiles(full_name)")\
        .eq("org_id", agent.org_id)\
        .order("added_at", desc=True)\
        .execute()
    return result.data


@router.delete("/dnc/remove/{phone}")
async def remove_from_dnc(
    phone: str,
    agent: AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    normalised = _normalise_phone(phone)
    db.table("dnc_list")\
        .delete()\
        .eq("org_id", agent.org_id)\
        .eq("phone", normalised)\
        .execute()
    return {"status": "ok", "removed": normalised}


async def is_on_dnc(phone: str, org_id: str, db) -> bool:
    normalised = _normalise_phone(phone)
    result = db.table("dnc_list")\
        .select("id")\
        .eq("org_id", org_id)\
        .eq("phone", normalised)\
        .execute()
    return bool(result.data)


def _normalise_phone(phone: str) -> str:
    """Digits only. Belgian 04xx → 32xxx."""
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        digits = "32" + digits[1:]
    return digits
