-- ============================================================
-- Call Forge Dialer — 08_functions.sql
-- Atomic contact locking with Adversus-style priority queue
-- ============================================================

-- ── get_next_contact ─────────────────────────────────────────
--
-- Priority queue (from Adversus IQ5 campaign config):
--   0  vip_callback      — due now (highest)
--   1  callback_private  — due now, same agent only
--   2  callback_shared   — due now, any agent
--   3  available         — fresh leads
--   4  auto_redial       — no answer, under max_attempts
--
-- Uses FOR UPDATE SKIP LOCKED: if two agents request simultaneously,
-- they always get DIFFERENT contacts — no double-dialing possible.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_next_contact(
  p_org_id         uuid,
  p_agent_id       uuid,
  p_campaign_id    uuid,
  p_max_attempts   int DEFAULT 5
)
RETURNS SETOF public.contacts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.contacts
  SET
    locked_by       = p_agent_id,
    locked_at       = now(),
    lock_expires_at = now() + interval '10 minutes',
    status          = 'locked'
  WHERE id = (
    SELECT id FROM public.contacts
    WHERE
      org_id      = p_org_id
      AND campaign_id = p_campaign_id
      AND (
        (status = 'vip_callback'     AND callback_at <= now())
        OR (status = 'callback_private' AND callback_at <= now() AND callback_agent_id = p_agent_id)
        OR (status = 'callback_shared'  AND callback_at <= now())
        OR  status = 'available'
        OR (status = 'auto_redial'   AND call_count < p_max_attempts)
      )
      AND (
        locked_by IS NULL
        OR lock_expires_at < now()
      )
    ORDER BY
      CASE status
        WHEN 'vip_callback'      THEN 0
        WHEN 'callback_private'  THEN 1
        WHEN 'callback_shared'   THEN 2
        WHEN 'available'         THEN 3
        WHEN 'auto_redial'       THEN 4
        ELSE 5
      END,
      lead_score DESC,
      created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;


-- ── release_expired_contact_locks ────────────────────────────
-- Called by APScheduler every 2 minutes.
-- Frees contacts whose lock expired (e.g. agent browser crashed).

CREATE OR REPLACE FUNCTION release_expired_contact_locks()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.contacts
  SET
    locked_by       = NULL,
    locked_at       = NULL,
    lock_expires_at = NULL,
    status          = 'available'
  WHERE
    locked_by IS NOT NULL
    AND lock_expires_at < now()
    AND status = 'locked';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
