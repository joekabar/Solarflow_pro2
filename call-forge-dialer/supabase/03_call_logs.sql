-- ============================================================
-- Call Forge Dialer — 03_call_logs.sql
-- Immutable call audit trail + agent state tracking
-- ============================================================

-- ── Call Logs ────────────────────────────────────────────────
CREATE TABLE public.call_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES public.organizations(id),
  contact_id   uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  agent_id     uuid NOT NULL REFERENCES public.user_profiles(id),
  campaign_id  uuid REFERENCES public.campaigns(id),
  team_id      uuid REFERENCES public.teams(id),

  -- Outcome & content
  outcome      text,
  dial_mode    text,
  duration_sec int,
  notes        text,
  script_path  jsonb,         -- array of branch choices made during call

  -- Provider info
  provider     text DEFAULT 'manual',
  call_sid     text,
  from_number  text,
  to_number    text,
  direction    text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound','inbound')),
  call_status  text NOT NULL DEFAULT 'completed'
    CHECK (call_status IN (
      'initiating','ringing','in_progress','on_hold',
      'completed','failed','busy','no_answer','cancelled'
    )),
  recording_url text,

  -- Denormalized for easy reporting
  appointment_at       timestamptz,
  appointment_location text,
  callback_at          timestamptz,

  -- Timestamps
  started_at   timestamptz DEFAULT now(),
  answered_at  timestamptz,
  ended_at     timestamptz
);

CREATE INDEX idx_call_logs_org       ON public.call_logs(org_id);
CREATE INDEX idx_call_logs_agent     ON public.call_logs(agent_id);
CREATE INDEX idx_call_logs_campaign  ON public.call_logs(campaign_id);
CREATE INDEX idx_call_logs_team      ON public.call_logs(team_id);
CREATE INDEX idx_call_logs_contact   ON public.call_logs(contact_id);
CREATE INDEX idx_call_logs_started   ON public.call_logs(started_at DESC);

-- ── Contact View Log (anti-scraping audit) ──────────────────
CREATE TABLE public.contact_view_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  contact_id   uuid NOT NULL,
  agent_id     uuid NOT NULL,
  campaign_id  uuid,
  viewed_at    timestamptz DEFAULT now()
);

-- ── Agent Telephony State ───────────────────────────────────
-- Tracks each agent's real-time state for supervisor live view
CREATE TABLE public.agent_telephony_state (
  agent_id              uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  org_id                uuid NOT NULL REFERENCES public.organizations(id),
  team_id               uuid REFERENCES public.teams(id),
  state                 text NOT NULL DEFAULT 'offline'
    CHECK (state IN ('offline','available','on_call','wrapup','break')),
  current_call_id       uuid REFERENCES public.call_logs(id),
  last_call_ended       timestamptz,
  avg_call_duration_sec int DEFAULT 120,
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_tel_state_org  ON public.agent_telephony_state(org_id, state);
CREATE INDEX idx_agent_tel_state_team ON public.agent_telephony_state(team_id, state);
