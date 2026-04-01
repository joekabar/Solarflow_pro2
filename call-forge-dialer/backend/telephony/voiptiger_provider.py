"""
backend/telephony/voiptiger_provider.py
─────────────────────────────────────────
VoIP Tiger SIP provider.

VoIP Tiger is a standard SIP PBX. All calling is BROWSER-SIDE via JsSIP
(WebRTC SIP over WebSocket port 8089). The backend's only job is to pass
the SIP credentials to the browser in generate_token().

Recordings are handled server-side by VoIP Tiger (Gespreksopnames setting).
Listen-in and Whisper are supported via VoIP Tiger's PBX features.

Architecture:
    Browser (JsSIP) ←─ WebSocket (wss://domain:8089/ws) ─→ VoIP Tiger PBX ─→ PSTN
                                                ↑
                        generate_token() returns these credentials
"""

from .base import (
    TelephonyProvider, TelephonyCredentials,
    AccessTokenResult, CallResult, CallbackEvent,
    CallState, CallDirection,
)
from typing import Optional, Dict, Any


class VoipTigerProvider(TelephonyProvider):
    """
    SIP config passthrough provider for VoIP Tiger.
    generate_token() returns SIP credentials so the browser JsSIP adapter
    can register directly with the VoIP Tiger PBX.
    All other methods raise NotImplementedError — calls are browser-initiated.
    """

    async def generate_token(
        self,
        agent_id:   str,
        agent_name: str,
        ttl:        int = 3600,
    ) -> AccessTokenResult:
        """
        Return SIP credentials for the browser JsSIP adapter.
        The frontend voiptigerAdapter.js uses these to create the JsSIP UA.
        """
        creds = self.credentials
        ws_url = creds.extra.get("ws_url") or f"wss://{creds.sip_domain}:8089/ws"

        return AccessTokenResult(
            token="voiptiger-sip-config",   # not a real token — just a signal
            identity=agent_id,
            ttl=ttl,
            extra={
                "sip_domain":   creds.sip_domain,
                "sip_username": creds.sip_username,
                "sip_password": creds.sip_password,
                "ws_url":       ws_url,
                "caller_id":    creds.phone_number,
            },
        )

    async def validate_credentials(self) -> bool:
        """Basic check — all required SIP fields present."""
        creds = self.credentials
        return bool(
            creds.sip_domain and
            creds.sip_username and
            creds.sip_password
        )

    # ── All call-control methods are no-ops ───────────────────
    # VoIP Tiger calls are fully browser-initiated via JsSIP.
    # The backend does not initiate or control calls.

    async def make_call(self, to, from_number=None, agent_id=None, metadata=None) -> CallResult:
        raise NotImplementedError("VoIP Tiger calls are browser-initiated via JsSIP")

    async def hangup(self, call_id: str) -> CallResult:
        raise NotImplementedError("Use JsSIP session.terminate() in the browser")

    async def hold(self, call_id: str) -> CallResult:
        raise NotImplementedError("Use JsSIP session.hold() in the browser")

    async def unhold(self, call_id: str) -> CallResult:
        raise NotImplementedError("Use JsSIP session.unhold() in the browser")

    async def mute(self, call_id: str) -> CallResult:
        raise NotImplementedError("Use JsSIP session.mute() in the browser")

    async def unmute(self, call_id: str) -> CallResult:
        raise NotImplementedError("Use JsSIP session.unmute() in the browser")

    async def send_dtmf(self, call_id: str, digits: str) -> CallResult:
        raise NotImplementedError("Use JsSIP session.sendDTMF() in the browser")

    async def start_recording(self, call_id: str) -> CallResult:
        raise NotImplementedError("Recordings handled server-side by VoIP Tiger PBX")

    async def stop_recording(self, call_id: str) -> CallResult:
        raise NotImplementedError("Recordings handled server-side by VoIP Tiger PBX")

    async def transfer(self, call_id: str, to: str, announce: bool = False) -> CallResult:
        raise NotImplementedError("Use JsSIP session.refer() in the browser")

    async def parse_callback(self, request_body: Dict[str, Any], headers=None) -> CallbackEvent:
        return CallbackEvent(
            call_id="voiptiger",
            state=CallState.COMPLETED,
            direction=CallDirection.OUTBOUND,
            raw=request_body,
        )

    async def build_dial_response(self, to, from_number=None, caller_name=None, record=False, timeout=30) -> str:
        return ""

    async def list_numbers(self) -> list:
        return [{"number": self.credentials.phone_number, "provider": "voiptiger"}]
