"""
SolarFlow Pro — FastAPI Backend
Entry point: starts the server and registers all routers.

Run locally:  uvicorn main:app --reload --port 8000
Production:   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from auth.session_manager  import router as auth_router
from dialer.next_contact   import router as dialer_router
from dialer.complete_call  import router as complete_router
from dialer.lock_cleanup   import release_expired_locks
from contacts.import_csv   import router as import_router
from compliance.dnc        import router as dnc_router
from telephony.routes      import router as telephony_router    # ← NEW

# Uncomment for v2:
# from ai.roi_calculator   import router as roi_router

app = FastAPI(
    title="SolarFlow Pro API",
    version="2.1.0",
    docs_url="/api/docs",
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://app.solarflowpro.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/api/auth")
app.include_router(dialer_router,     prefix="/api/dialer")
app.include_router(complete_router,   prefix="/api/dialer")
app.include_router(import_router,     prefix="/api/contacts")
app.include_router(dnc_router,        prefix="/api/compliance")
app.include_router(telephony_router,  prefix="/api/telephony")  # ← NEW

# Uncomment for v2:
# app.include_router(roi_router,      prefix="/api/ai")

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
