"""SolarFlow Pro v2 — FastAPI Backend."""
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pydantic import BaseModel

from auth.session_manager import router as auth_router
from auth.user_management import router as users_router
from auth.platform_admin  import router as platform_router
from dialer.next_contact  import router as dialer_router
from dialer.complete_call import router as complete_router
from dialer.lock_cleanup  import release_expired_locks
from contacts.import_csv  import router as import_router
from compliance.dnc       import router as dnc_router
from ai.roi_calculator    import router as roi_router
from campaigns.campaigns_api import router as campaigns_router
from auth.role_guard      import require_role
from ai.roof_intelligence import get_or_analyse_roof
from db import get_supabase

import os

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in cors_origins.split(",")]

app = FastAPI(title="SolarFlow Pro API", version="2.0.0", docs_url="/api/docs")
app.add_middleware(CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth_router,       prefix="/api/auth")
app.include_router(users_router,      prefix="/api")
app.include_router(platform_router,   prefix="/api")
app.include_router(dialer_router,     prefix="/api/dialer")
app.include_router(complete_router,   prefix="/api/dialer")
app.include_router(import_router,     prefix="/api/contacts")
app.include_router(dnc_router,        prefix="/api/compliance")
app.include_router(roi_router,        prefix="/api/ai")
app.include_router(campaigns_router,  prefix="/api")

class RoofRequest(BaseModel):
    contact_id: str; address: str; country: str = "BE"

@app.post("/api/ai/roof/analyse")
async def analyse_roof(body: RoofRequest,
    agent=Depends(require_role("agent","supervisor","admin")),
    db=Depends(get_supabase)):
    result = await get_or_analyse_roof(body.contact_id, body.address, body.country, db)
    if not result: return {"status":"unavailable","analysis":None}
    from dataclasses import asdict
    return {"status":"ok","analysis":asdict(result)}

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    scheduler.add_job(release_expired_locks,"interval",minutes=5)
    scheduler.start()
    print("✅ SolarFlow Pro v2 started")

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

@app.get("/api/health")
async def health():
    return {"status":"ok","version":"2.0.0"}
