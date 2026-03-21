"""
backend/contacts/import_csv.py
────────────────────────────────
Imports contacts from a CSV or Excel file.

Supported columns (flexible — maps common variations):
  first_name, last_name, phone, email,
  street, city, postal_code, lead_score

The importer:
  1. Validates and normalises phone numbers
  2. Skips duplicates (same phone + org)
  3. Skips numbers already on the DNC list
  4. Assigns a default lead_score of 50 if not provided
  5. Stores the address as street_original (hidden from agents)
"""

import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from compliance.dnc import is_on_dnc, _normalise_phone
from db import get_supabase

router = APIRouter()

# Map of common CSV column name variations → our canonical field name
COLUMN_MAP = {
    "first_name": ["first_name", "firstname", "voornaam", "prénom", "vorname"],
    "last_name":  ["last_name",  "lastname",  "naam",  "achternaam", "nom", "nachname"],
    "phone":      ["phone", "tel", "telefoon", "telephone", "mobile", "gsm", "nummer"],
    "email":      ["email", "e-mail", "mail"],
    "street":     ["street", "straat", "adres", "address", "rue", "strasse"],
    "city":       ["city", "stad", "gemeente", "ville", "ort"],
    "postal_code":["postal_code", "postcode", "zip", "plz"],
    "lead_score": ["lead_score", "score", "prioriteit"],
}


@router.post("/import")
async def import_contacts(
    campaign_id: str = Form(...),
    file: UploadFile = File(...),
    agent: AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    """
    Accepts a CSV or Excel file and imports contacts into a campaign.
    Returns a summary: imported, skipped_dnc, skipped_duplicate, errors.
    """
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(400, "File must be .csv, .xlsx, or .xls")

    # Read file content
    content = await file.read()

    # Parse rows based on file type
    if file.filename.endswith(".csv"):
        rows = _parse_csv(content)
    else:
        rows = _parse_excel(content)

    if not rows:
        raise HTTPException(400, "File is empty or could not be parsed")

    # Detect column mapping from first row headers
    col_map = _detect_columns(rows[0].keys())

    stats = {
        "imported":           0,
        "skipped_dnc":        0,
        "skipped_duplicate":  0,
        "skipped_no_phone":   0,
        "errors":             0,
        "total_rows":         len(rows),
    }

    # Load existing phones to detect duplicates efficiently
    existing = db.table("contacts")\
        .select("phone")\
        .eq("org_id", agent.org_id)\
        .execute()
    existing_phones = {
        _normalise_phone(r["phone"]) for r in (existing.data or [])
    }

    batch = []

    for row in rows:
        try:
            # Extract phone (required)
            raw_phone = row.get(col_map.get("phone", "phone"), "").strip()
            if not raw_phone:
                stats["skipped_no_phone"] += 1
                continue

            phone = _normalise_phone(raw_phone)

            # Skip duplicates
            if phone in existing_phones:
                stats["skipped_duplicate"] += 1
                continue

            # Skip DNC
            if await is_on_dnc(phone, agent.org_id, db):
                stats["skipped_dnc"] += 1
                continue

            # Build contact record
            contact = {
                "org_id":          agent.org_id,
                "campaign_id":     campaign_id,
                "phone":           phone,
                "first_name":      row.get(col_map.get("first_name", ""), "").strip() or None,
                "last_name":       row.get(col_map.get("last_name",  ""), "").strip() or None,
                "email":           row.get(col_map.get("email",      ""), "").strip() or None,
                # Address stored as original — hidden from agents
                "street_original":      row.get(col_map.get("street",       ""), "").strip() or None,
                "city_original":        row.get(col_map.get("city",         ""), "").strip() or None,
                "postal_code_original": row.get(col_map.get("postal_code",  ""), "").strip() or None,
                "lead_score": _safe_int(
                    row.get(col_map.get("lead_score", ""), "50"), 50
                ),
                "status":      "available",
                "lead_source": "import",
            }

            batch.append(contact)
            existing_phones.add(phone)

            # Insert in batches of 100 for performance
            if len(batch) >= 100:
                db.table("contacts").insert(batch).execute()
                stats["imported"] += len(batch)
                batch = []

        except Exception as e:
            stats["errors"] += 1
            print(f"[import] Row error: {e}")

    # Insert remaining batch
    if batch:
        db.table("contacts").insert(batch).execute()
        stats["imported"] += len(batch)

    return {
        "status": "ok",
        "stats":  stats,
        "message": (
            f"Import complete: {stats['imported']} contacts imported, "
            f"{stats['skipped_duplicate']} duplicates skipped, "
            f"{stats['skipped_dnc']} DNC skipped."
        ),
    }


def _parse_csv(content: bytes) -> list[dict]:
    text   = content.decode("utf-8-sig")   # handles BOM from Excel exports
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def _parse_excel(content: bytes) -> list[dict]:
    try:
        import openpyxl
        wb   = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
        ws   = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(h).strip().lower() if h else "" for h in rows[0]]
        return [
            {headers[i]: (str(v).strip() if v is not None else "")
             for i, v in enumerate(row)}
            for row in rows[1:]
        ]
    except ImportError:
        raise HTTPException(500, "openpyxl not installed — CSV import still works")


def _detect_columns(headers: list) -> dict:
    """
    Maps our canonical field names to actual CSV column headers.
    Case-insensitive. Returns best match or original name.
    """
    headers_lower = {h.lower().strip(): h for h in headers}
    result = {}

    for canonical, variants in COLUMN_MAP.items():
        for variant in variants:
            if variant.lower() in headers_lower:
                result[canonical] = headers_lower[variant.lower()]
                break

    return result


def _safe_int(value: str, default: int) -> int:
    try:
        v = int(float(str(value).strip()))
        return max(0, min(100, v))   # clamp to 0-100
    except (ValueError, TypeError):
        return default
