"""
backend/telephony/factory.py
────────────────────────────
Provider factory + credential encryption.
To add a new provider: create the class, add to PROVIDER_REGISTRY.
"""

import json
import logging
from typing import Dict, Type

from cryptography.fernet import Fernet

from .base import TelephonyProvider, TelephonyCredentials, AccessTokenResult, CallResult, CallState, CallDirection, CallbackEvent
from .voiptiger_provider import VoipTigerProvider

logger = logging.getLogger(__name__)


# ── Manual (no-op) provider ───────────────────────────────────

class ManualProvider(TelephonyProvider):
    """Trial mode. Agents dial on their own phone. No browser softphone."""

    async def generate_token(self, agent_id, agent_name, ttl=3600):
        return None

    async def make_call(self, to, from_number=None, agent_id=None, metadata=None):
        return CallResult(call_id=f"manual-{agent_id}", state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND, to_number=to)

    async def hangup(self, call_id):
        return CallResult(call_id=call_id, state=CallState.COMPLETED, direction=CallDirection.OUTBOUND)

    async def hold(self, call_id):
        return CallResult(call_id=call_id, state=CallState.ON_HOLD, direction=CallDirection.OUTBOUND)

    async def unhold(self, call_id):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def mute(self, call_id):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def unmute(self, call_id):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def send_dtmf(self, call_id, digits):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def start_recording(self, call_id):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def stop_recording(self, call_id):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def transfer(self, call_id, to, announce=False):
        return CallResult(call_id=call_id, state=CallState.IN_PROGRESS, direction=CallDirection.OUTBOUND)

    async def parse_callback(self, request_body, headers=None):
        return CallbackEvent(call_id="manual", state=CallState.COMPLETED, direction=CallDirection.OUTBOUND, raw=request_body)

    async def build_dial_response(self, to, from_number=None, caller_name=None, record=False, timeout=30):
        return ""

    async def list_numbers(self):
        return []

    async def validate_credentials(self):
        return True


# ── Provider registry ─────────────────────────────────────────

PROVIDER_REGISTRY: Dict[str, Type[TelephonyProvider]] = {
    "manual":     ManualProvider,
    "voiptiger":  VoipTigerProvider,
}


# ── Credential encryption ─────────────────────────────────────

def _get_fernet(encryption_key: str) -> Fernet:
    if not encryption_key:
        raise ValueError(
            "CREDENTIAL_ENCRYPTION_KEY not set. "
            "Generate: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    try:
        return Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
    except Exception:
        raise ValueError("CREDENTIAL_ENCRYPTION_KEY is invalid — must be a 32-byte url-safe base64 string.")


def encrypt_credentials(credentials: TelephonyCredentials, encryption_key: str) -> str:
    data = {
        "provider":         credentials.provider,
        "account_sid":      credentials.account_sid,
        "auth_token":       credentials.auth_token,
        "api_key_sid":      credentials.api_key_sid,
        "api_key_secret":   credentials.api_key_secret,
        "twiml_app_sid":    credentials.twiml_app_sid,
        "phone_number":     credentials.phone_number,
        "sip_domain":       credentials.sip_domain,
        "sip_username":     credentials.sip_username,
        "sip_password":     credentials.sip_password,
        "webhook_base_url": credentials.webhook_base_url,
        "extra":            credentials.extra,
    }
    return _get_fernet(encryption_key).encrypt(json.dumps(data).encode()).decode()


def decrypt_credentials(encrypted: str, encryption_key: str) -> TelephonyCredentials:
    data = json.loads(_get_fernet(encryption_key).decrypt(encrypted.encode()).decode())
    return TelephonyCredentials(**data)


# ── Factory ───────────────────────────────────────────────────

async def get_provider(org_id: str, db, encryption_key: str) -> TelephonyProvider:
    result = db.table("organizations").select(
        "telephony_provider, telephony_credentials_encrypted"
    ).eq("id", org_id).single().execute()

    org           = result.data if result.data else {}
    provider_name = org.get("telephony_provider", "manual")
    encrypted     = org.get("telephony_credentials_encrypted")

    if not encrypted or provider_name == "manual":
        return ManualProvider(TelephonyCredentials(provider="manual"))

    credentials   = decrypt_credentials(encrypted, encryption_key)
    provider_class = PROVIDER_REGISTRY.get(provider_name)

    if not provider_class:
        raise ValueError(f"Unknown telephony provider: {provider_name}")

    return provider_class(credentials)


async def get_available_providers() -> list:
    return [{"id": name, "name": name.title()} for name in PROVIDER_REGISTRY]
