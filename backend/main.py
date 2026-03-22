"""
SolarFlow Pro — FastAPI Backend
"""

from dotenv import load_dotenv
load_dotenv()

import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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

# ── Global exception handler ──────────────────────────────────
# When unhandled exceptions escape the route, Starlette sends a bare 500
# *before* CORSMiddleware can inject headers — the browser then reports it
# as a CORS error even though CORS is configured correctly.
# This handler catches every unhandled exception inside the app so FastAPI
# always returns a proper JSON response with CORS headers included.

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
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
