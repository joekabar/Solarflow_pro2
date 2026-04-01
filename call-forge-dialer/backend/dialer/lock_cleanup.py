"""
backend/dialer/lock_cleanup.py
────────────────────────────────
Background job: releases expired contact locks every 2 minutes.

Why: agent's browser crashes, network drops, laptop closes mid-call.
Without this, contacts stay locked until get_next_contact skips them
via lock_expires_at check. This job catches them at expiry time.
"""

import logging
from db import get_supabase

logger = logging.getLogger(__name__)


async def release_expired_locks():
    """
    Reverts all contacts whose lock has expired back to 'available'.
    Safe to run concurrently — the WHERE clause is atomic.
    """
    db = get_supabase()

    result = db.table("contacts").update({
        "locked_by":       None,
        "locked_at":       None,
        "lock_expires_at": None,
        "status":          "available",
    })\
    .eq("status", "locked")\
    .lt("lock_expires_at", "now()")\
    .execute()

    released = len(result.data) if result.data else 0
    if released > 0:
        logger.info(f"[lock_cleanup] Released {released} expired contact locks")

    return released
