"""
SolarFlow Pro — FastAPI Backend
"""

from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from auth.session_manager    import router as auth_router
from auth.platform_admin     import router as platform_router
from auth.user_management    import router as user_router
from dialer.next_contact     import router as dialer_router
from dialer.complete_call    import router as complete_router
from dialer.lock_cleanup     import release_expired_locks
from contacts.import_csv     import router as import_router
from compliance.dnc          import router as dnc_router
from campaigns.campaigns_api import router as campaigns_router
from telephony.routes        import router as telephony_router
# from ai.roi_calculator     import router as roi_router  # v2

app = FastAPI(
    title="SolarFlow Pro API",
    version="2.1.0",
    docs_url="/api/docs",
)

# ── CORS ─────────────────────────────────────────────────────
# Auth is enforced via JWT bearer tokens, so wildcard origin is safe.
# To restrict in future, set ALLOWED_ORIGINS env var (comma-separated).
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = _origins_env.split(",") if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],  # credentials=True incompatible with wildcard
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/api/auth")
app.include_router(platform_router,   prefix="/api")
app.include_router(user_router,       prefix="/api")
app.include_router(dialer_router,     prefix="/api/dialer")
app.include_router(complete_router,   prefix="/api/dialer")
app.include_router(import_router,     prefix="/api/contacts")
app.include_router(dnc_router,        prefix="/api/compliance")
app.include_router(campaigns_router,  prefix="/api/campaigns")
app.include_router(telephony_router,  prefix="/api/telephony")
# app.include_router(roi_router,      prefix="/api/ai")  # v2

# ── Background scheduler ─────────────────────────────────────
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    scheduler.add_job(release_expired_locks, "interval", minutes=5)
    scheduler.start()
    print("✅ SolarFlow Pro API started (telephony integration enabled)")

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

# ── Health check ─────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.1.0", "telephony": True}
