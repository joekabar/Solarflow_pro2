"""
backend/auth/role_guard.py
───────────────────────────
Decorator factory for role-based access control.

Usage:
    @router.post("/endpoint")
    async def route(agent=Depends(require_role("admin","supervisor"))):
        ...
"""

from fastapi import HTTPException, Depends
from datetime import datetime, timezone
from .jwt_validator import get_current_agent, AgentContext


def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that:
    1. Validates JWT (via get_current_agent)
    2. Checks account is active
    3. Checks trial hasn't expired
    4. Checks user role is in allowed_roles
    """
    async def dependency(
        agent: AgentContext = Depends(get_current_agent)
    ) -> AgentContext:

        if not agent.org_is_active:
            raise HTTPException(403, "Account is inactive")

        if agent.org_plan == "trial" and agent.trial_ends_at:
            trial_end = datetime.fromisoformat(
                agent.trial_ends_at.replace("Z", "+00:00")
            )
            now = datetime.now(timezone.utc)
            if now > trial_end:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "error":   "trial_expired",
                        "message": "Your trial has ended. Please upgrade.",
                    }
                )
            agent.trial_days_remaining = max(0, (trial_end - now).days)

        if agent.role not in allowed_roles:
            raise HTTPException(
                403,
                f"Access denied. Required role: {' or '.join(allowed_roles)}"
            )

        return agent

    return dependency
