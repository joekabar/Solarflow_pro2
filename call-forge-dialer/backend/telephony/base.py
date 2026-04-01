"""
backend/telephony/base.py
─────────────────────────
Abstract base class for all telephony providers.
Copied from SolarFlow Pro — unchanged.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any


class CallDirection(str, Enum):
    OUTBOUND = "outbound"
    INBOUND  = "inbound"


class CallState(str, Enum):
    IDLE        = "idle"
    INITIATING  = "initiating"
    RINGING     = "ringing"
    IN_PROGRESS = "in_progress"
    ON_HOLD     = "on_hold"
    COMPLETED   = "completed"
    FAILED      = "failed"
    BUSY        = "busy"
    NO_ANSWER   = "no_answer"
    CANCELLED   = "cancelled"


class DialingMode(str, Enum):
    PREVIEW  = "preview"
    POWER    = "power"
    MANUAL   = "manual"


@dataclass
class TelephonyCredentials:
    provider:         str
    account_sid:      Optional[str] = None
    auth_token:       Optional[str] = None
    api_key_sid:      Optional[str] = None
    api_key_secret:   Optional[str] = None
    twiml_app_sid:    Optional[str] = None
    phone_number:     Optional[str] = None       # default caller ID E.164
    sip_domain:       Optional[str] = None
    sip_username:     Optional[str] = None
    sip_password:     Optional[str] = None
    webhook_base_url: Optional[str] = None
    extra:            Dict[str, Any] = field(default_factory=dict)


@dataclass
class AccessTokenResult:
    token:    str
    identity: str
    ttl:      int = 3600
    extra:    Dict[str, Any] = field(default_factory=dict)


@dataclass
class CallResult:
    call_id:       str
    state:         CallState
    direction:     CallDirection
    from_number:   Optional[str] = None
    to_number:     Optional[str] = None
    duration_sec:  Optional[int] = None
    recording_url: Optional[str] = None
    extra:         Dict[str, Any] = field(default_factory=dict)


@dataclass
class CallbackEvent:
    call_id:       str
    state:         CallState
    direction:     CallDirection
    from_number:   Optional[str] = None
    to_number:     Optional[str] = None
    duration_sec:  Optional[int] = None
    recording_url: Optional[str] = None
    timestamp:     Optional[str] = None
    raw:           Dict[str, Any] = field(default_factory=dict)


class TelephonyProvider(ABC):

    def __init__(self, credentials: TelephonyCredentials):
        self.credentials = credentials

    @abstractmethod
    async def generate_token(self, agent_id: str, agent_name: str, ttl: int = 3600) -> AccessTokenResult: ...

    @abstractmethod
    async def make_call(self, to: str, from_number: Optional[str] = None, agent_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> CallResult: ...

    @abstractmethod
    async def hangup(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def hold(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def unhold(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def mute(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def unmute(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def send_dtmf(self, call_id: str, digits: str) -> CallResult: ...

    @abstractmethod
    async def start_recording(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def stop_recording(self, call_id: str) -> CallResult: ...

    @abstractmethod
    async def transfer(self, call_id: str, to: str, announce: bool = False) -> CallResult: ...

    @abstractmethod
    async def parse_callback(self, request_body: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> CallbackEvent: ...

    @abstractmethod
    async def build_dial_response(self, to: str, from_number: Optional[str] = None, caller_name: Optional[str] = None, record: bool = False, timeout: int = 30) -> str: ...

    @abstractmethod
    async def list_numbers(self) -> list: ...

    @abstractmethod
    async def validate_credentials(self) -> bool: ...
