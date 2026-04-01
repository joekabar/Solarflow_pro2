"""
Call Forge Dialer — FastAPI Backend
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from auth.session_manager   import router as auth_router
from teams.teams_api        import router as teams_router
from campaigns.campaigns_api import router as campaigns_router
from dialer.next_contact    import router as dialer_router
from dialer.complete_call   import router as complete_router
from dialer.lock_cleanup    import release_expired_locks
from contacts.import_csv    import router as import_router
from compliance.dnc         import router as dnc_router
from telephony.routes       import router as telephony_router
from scripts.scripts_api    import router as scripts_router
from reports.reports_api    import router as reports_router

app = FastAPI(
    title="Call Forge Dialer API",
    version="1.0.0",
    docs_url="/api/docs",
)

logger = logging.getLogger(__name__)

# ── CORS ──────────────────────────────────────────────────────
_origins_env   = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = _origins_env.split(",") if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOWED_ORIGINS != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ──────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/api/auth")
app.include_router(teams_router,      prefix="/api/teams")
app.include_router(campaigns_router,  prefix="/api/campaigns")
app.include_router(dialer_router,     prefix="/api/dialer")
app.include_router(complete_router,   prefix="/api/dialer")
app.include_router(import_router,     prefix="/api/contacts")
app.include_router(dnc_router,        prefix="/api/compliance")
app.include_router(telephony_router,  prefix="/api/telephony")
app.include_router(scripts_router,    prefix="/api/scripts")
app.include_router(reports_router,    prefix="/api/reports")

# ── Background scheduler ──────────────────────────────────────
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    scheduler.add_job(release_expired_locks, "interval", minutes=2)
    scheduler.start()
    print("✅ Call Forge Dialer API started")

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

# ── Health check ──────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "app": "call-forge-dialer"}
