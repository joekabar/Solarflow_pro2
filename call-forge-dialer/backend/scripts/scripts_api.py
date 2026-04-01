"""
backend/scripts/scripts_api.py
────────────────────────────────
CRUD for call scripts. Scripts are JSONB branching trees.
Structure: { steps: [{id, text, branches: [{label, next|outcome}]}] }
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from auth.role_guard import require_role
from auth.jwt_validator import AgentContext
from db import get_supabase

router = APIRouter()


class ScriptCreate(BaseModel):
    name:        str
    language:    str = "nl"
    campaign_id: Optional[str] = None
    content:     Any  # JSONB tree


class ScriptUpdate(BaseModel):
    name:     Optional[str] = None
    language: Optional[str] = None
    content:  Optional[Any] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_scripts(
    campaign_id: Optional[str] = None,
    agent:       AgentContext = Depends(require_role("admin", "supervisor", "agent")),
    db=Depends(get_supabase),
):
    q = db.table("scripts")\
        .select("id, name, language, campaign_id, is_active, created_at")\
        .eq("org_id", agent.org_id)
    if campaign_id:
        q = q.eq("campaign_id", campaign_id)
    result = q.order("created_at", desc=True).execute()
    return result.data


@router.get("/{script_id}")
async def get_script(
    script_id: str,
    agent:     AgentContext = Depends(require_role("admin", "supervisor", "agent")),
    db=Depends(get_supabase),
):
    result = db.table("scripts")\
        .select("*")\
        .eq("id", script_id)\
        .eq("org_id", agent.org_id)\
        .single()\
        .execute()
    if not result.data:
        raise HTTPException(404, "Script not found")
    return result.data


@router.post("")
async def create_script(
    body:  ScriptCreate,
    agent: AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    result = db.table("scripts").insert({
        "org_id":      agent.org_id,
        "campaign_id": body.campaign_id,
        "name":        body.name,
        "language":    body.language,
        "content":     body.content,
    }).execute()
    return result.data[0]


@router.put("/{script_id}")
async def update_script(
    script_id: str,
    body:      ScriptUpdate,
    agent:     AgentContext = Depends(require_role("admin", "supervisor")),
    db=Depends(get_supabase),
):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    result = db.table("scripts")\
        .update(upd)\
        .eq("id", script_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    if not result.data:
        raise HTTPException(404, "Script not found")
    return result.data[0]


@router.delete("/{script_id}")
async def delete_script(
    script_id: str,
    agent:     AgentContext = Depends(require_role("admin")),
    db=Depends(get_supabase),
):
    db.table("scripts")\
        .delete()\
        .eq("id", script_id)\
        .eq("org_id", agent.org_id)\
        .execute()
    return {"status": "ok"}
