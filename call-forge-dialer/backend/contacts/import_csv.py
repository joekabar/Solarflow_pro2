"""
backend/contacts/import_csv.py
────────────────────────────────
CSV import for contacts. Generic: maps columns to contact fields.
Extra columns go into custom_fields JSONB.
Validates E.164 phone format (+32...) for Belgian numbers.
"""

import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()

STANDARD_FIELDS = {
    "first_name", "last_name", "phone", "email", "company", "address", "lead_score"
}


@router.post("/import")
async def import_contacts(
    campaign_id: str      = Form(...),
    file:        UploadFile = File(...),
    agent:       AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    content  = await file.read()
    text     = content.decode("utf-8-sig")  # handle BOM
    reader   = csv.DictReader(io.StringIO(text))

    rows = []
    errors = []

    for i, row in enumerate(reader, start=2):
        phone = (row.get("phone") or row.get("Phone") or "").strip()
        if not phone:
            errors.append(f"Row {i}: missing phone")
            continue

        # Normalise Belgian phone
        phone = _normalise_phone(phone)

        standard = {}
        custom   = {}

        for col, val in row.items():
            key = col.strip().lower().replace(" ", "_")
            if key in STANDARD_FIELDS:
                standard[key] = val.strip() if val else None
            elif key != "phone":
                custom[key] = val.strip() if val else None

        # lead_score must be int
        if "lead_score" in standard:
            try:
                standard["lead_score"] = int(standard["lead_score"])
            except (ValueError, TypeError):
                standard["lead_score"] = 50

        rows.append({
            "org_id":        agent.org_id,
            "campaign_id":   campaign_id,
            "phone":         phone,
            **standard,
            "custom_fields": custom,
        })

    if not rows:
        raise HTTPException(400, f"No valid contacts found. Errors: {errors[:5]}")

    # Upsert in batches of 500
    inserted = 0
    for i in range(0, len(rows), 500):
        batch = rows[i:i+500]
        try:
            db.table("contacts").upsert(
                batch,
                on_conflict="org_id,campaign_id,phone",
            ).execute()
            inserted += len(batch)
        except Exception as e:
            errors.append(f"Batch {i//500 + 1} error: {e}")

    return {
        "status":   "ok",
        "inserted": inserted,
        "errors":   errors[:10],
    }


@router.delete("/campaign/{campaign_id}/clear")
async def clear_campaign_contacts(
    campaign_id: str,
    agent:       AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    """Delete all contacts for a campaign. Irreversible."""
    db.table("contacts")\
        .delete()\
        .eq("campaign_id", campaign_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    return {"status": "ok"}


def _normalise_phone(phone: str) -> str:
    """Normalise to E.164 (+32...) format."""
    digits = "".join(c for c in phone if c.isdigit())
    # Belgian 04xx (10 digits) → +3248xx
    if digits.startswith("0") and len(digits) == 10:
        digits = "32" + digits[1:]
    # If no country code prefix, assume Belgium
    if len(digits) == 9:
        digits = "32" + digits
    return f"+{digits}" if not phone.startswith("+") else f"+{digits}"
