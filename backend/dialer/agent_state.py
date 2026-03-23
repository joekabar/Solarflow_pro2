"""
backend/dialer/agent_state.py
──────────────────────────────
Helpers to update agent_telephony_state.
Called by complete_call and the telephony webhook handler.

State lifecycle:
    offline  →  available  →  on_call  →  wrapup  →  available
                    ↑                                     │
                    └──────────────────────────────────────┘
"""

from datetime import datetime, timezone


def set_agent_state(agent_id: str, org_id: str, state: str, db, **extra) -> None:
    """
    Upsert the agent's telephony state row.
    Extra kwargs are merged into the update payload (e.g. last_call_ended, avg_call_duration_sec).
    """
    data = {
        "agent_id":  agent_id,
        "org_id":    org_id,
        "state":     state,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **extra,
    }
    try:
        db.table("agent_telephony_state") \
            .upsert(data, on_conflict="agent_id") \
            .execute()
    except Exception as e:
        print(f"[agent_state] Failed to set state={state} for agent {agent_id}: {e}")


def record_call_end(agent_id: str, org_id: str, duration_sec: int | None, db) -> None:
    """
    Transition agent to wrapup and update rolling average call duration.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Fetch existing avg for rolling update
    avg = None
    if duration_sec and duration_sec > 0:
        try:
            row = db.table("agent_telephony_state") \
                .select("avg_call_duration_sec") \
                .eq("agent_id", agent_id) \
                .execute()
            prev_avg = (row.data[0].get("avg_call_duration_sec") or duration_sec) if row.data else duration_sec
            # Exponential moving average (alpha = 0.3)
            avg = round(0.3 * duration_sec + 0.7 * prev_avg)
        except Exception:
            avg = duration_sec

    set_agent_state(
        agent_id, org_id, "wrapup", db,
        last_call_ended=now,
        **({"avg_call_duration_sec": avg} if avg else {}),
    )
