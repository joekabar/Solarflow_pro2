"""
backend/telephony/routes.py
───────────────────────────
Telephony routes — provider-agnostic.
For VoIP Tiger: /token returns SIP credentials for JsSIP browser adapter.
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.role_guard import require_role
from db import get_supabase
from .factory import get_provider, get_available_providers, encrypt_credentials
from .base import TelephonyCredentials

logger = logging.getLogger(__name__)
router = APIRouter(tags=["telephony"])

ENCRYPTION_KEY = os.getenv("CREDENTIAL_ENCRYPTION_KEY", "")


async def _get_org_provider(
    agent=Depends(require_role("agent", "supervisor", "admin")),
    db=Depends(get_supabase),
):
    provider = await get_provider(agent.org_id, db, ENCRYPTION_KEY)
    return provider, agent, db


class SetupCredentialsRequest(BaseModel):
    provider:         str
    sip_domain:       Optional[str] = None
    sip_username:     Optional[str] = None
    sip_password:     Optional[str] = None
    ws_url:           Optional[str] = None   # VoIP Tiger WebSocket URL
    phone_number:     Optional[str] = None   # E.164 caller ID
    # Legacy Twilio fields (kept for future extensibility)
    account_sid:      Optional[str] = None
    auth_token:       Optional[str] = None
    api_key_sid:      Optional[str] = None
    api_key_secret:   Optional[str] = None
    twiml_app_sid:    Optional[str] = None
    webhook_base_url: Optional[str] = None


# ── 1. Token (browser softphone init) ────────────────────────

@router.post("/token")
async def get_telephony_token(deps=Depends(_get_org_provider)):
    """
    Generate SIP config / token for the browser softphone.
    For VoIP Tiger: returns SIP credentials so JsSIP can register.
    Called when the agent workspace mounts.
    """
    provider, agent, db = deps

    result = await provider.generate_token(
        agent_id=agent.id,
        agent_name=agent.full_name or agent.id,
    )

    if result is None:
        return {"provider": "manual", "token": None, "identity": None, "ttl": None}

    return {
        "provider": provider.credentials.provider,
        "token":    result.token,
        "identity": result.identity,
        "ttl":      result.ttl,
        **result.extra,   # includes sip_domain, ws_url, sip_username, sip_password, caller_id
    }


# ── 2. Available providers ────────────────────────────────────

@router.get("/providers")
async def list_providers(agent=Depends(require_role("admin"))):
    return await get_available_providers()


# ── 3. Get current telephony setup ───────────────────────────

@router.get("/setup")
async def get_telephony_setup(
    agent=Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    result = db.table("organizations").select(
        "telephony_provider, telephony_credentials_encrypted, telephony_phone_number"
    ).eq("id", agent.org_id).single().execute()

    org           = result.data if result.data else {}
    provider_name = org.get("telephony_provider", "manual")
    encrypted     = org.get("telephony_credentials_encrypted")

    if not encrypted or provider_name == "manual":
        return {"provider": "manual", "configured": False}

    try:
        creds = decrypt_credentials(encrypted, ENCRYPTION_KEY)
    except Exception as e:
        return {"provider": provider_name, "configured": True, "error": str(e)}

    def mask(v, show=4):
        if not v: return None
        return v[:show] + "***" if len(v) > show else v

    return {
        "provider":     provider_name,
        "configured":   True,
        "sip_domain":   creds.sip_domain,
        "sip_username": mask(creds.sip_username),
        "phone_number": creds.phone_number,
        "ws_url":       creds.extra.get("ws_url"),
    }


# ── 4. Save telephony credentials ────────────────────────────

@router.post("/setup")
async def setup_telephony(
    body:  SetupCredentialsRequest,
    agent=Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    """Encrypt and save telephony credentials. Admin only."""
    from .factory import PROVIDER_REGISTRY
    if body.provider not in PROVIDER_REGISTRY:
        raise HTTPException(400, f"Unknown provider: {body.provider}")

    credentials = TelephonyCredentials(
        provider=body.provider,
        sip_domain=body.sip_domain,
        sip_username=body.sip_username,
        sip_password=body.sip_password,
        phone_number=body.phone_number,
        account_sid=body.account_sid,
        auth_token=body.auth_token,
        extra={"ws_url": body.ws_url} if body.ws_url else {},
    )

    provider = PROVIDER_REGISTRY[body.provider](credentials)
    valid = await provider.validate_credentials()
    if not valid:
        raise HTTPException(400, "Credentials validation failed — check SIP domain, username and password")

    if not ENCRYPTION_KEY:
        raise HTTPException(500, "CREDENTIAL_ENCRYPTION_KEY not set on server")

    encrypted = encrypt_credentials(credentials, ENCRYPTION_KEY)

    db.table("organizations").update({
        "telephony_provider":              body.provider,
        "telephony_credentials_encrypted": encrypted,
        "telephony_phone_number":          body.phone_number,
    }).eq("id", agent.org_id).execute()

    return {"status": "ok", "provider": body.provider}


# ── 5. Validate credentials (without saving) ─────────────────

@router.post("/setup/validate")
async def validate_credentials(
    body:  SetupCredentialsRequest,
    agent=Depends(require_role("admin")),
):
    from .factory import PROVIDER_REGISTRY
    if body.provider not in PROVIDER_REGISTRY:
        raise HTTPException(400, f"Unknown provider: {body.provider}")

    credentials = TelephonyCredentials(
        provider=body.provider,
        sip_domain=body.sip_domain,
        sip_username=body.sip_username,
        sip_password=body.sip_password,
        phone_number=body.phone_number,
        extra={"ws_url": body.ws_url} if body.ws_url else {},
    )

    provider = PROVIDER_REGISTRY[body.provider](credentials)
    valid    = await provider.validate_credentials()
    return {"valid": valid}


def decrypt_credentials(encrypted, key):
    from .factory import decrypt_credentials as _dec
    return _dec(encrypted, key)
