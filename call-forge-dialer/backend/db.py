"""
backend/db.py
──────────────
Supabase client factory.
Uses SERVICE ROLE key so backend bypasses RLS.
RLS is enforced by the frontend (anon key) — the backend
validates JWTs manually via jwt_validator.py.
"""

import os
from functools import lru_cache
from supabase import create_client, Client

SUPABASE_URL          = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_KEY")


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
