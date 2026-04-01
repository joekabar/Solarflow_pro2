-- ============================================================
-- Call Forge Dialer — 05_appointments.sql
-- Generic appointments (Zoho CRM integration ready)
-- ============================================================

CREATE TABLE public.appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id),
  team_id         uuid REFERENCES public.teams(id),
  contact_id      uuid REFERENCES public.contacts(id),
  agent_id        uuid NOT NULL REFERENCES public.user_profiles(id),
  campaign_id     uuid REFERENCES public.campaigns(id),

  title           text,
  scheduled_at    timestamptz NOT NULL,
  duration_min    int DEFAULT 60,
  location        text,    -- free-form: address, "online", Zoom link, etc.
  notes           text,
  status          text DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),

  -- External integrations
  zoho_event_id   text,    -- Zoho CRM calendar event ID (Phase 5)
  gcal_event_id   text,    -- Google Calendar event ID (future)

  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_appointments_org      ON public.appointments(org_id);
CREATE INDEX idx_appointments_team     ON public.appointments(team_id);
CREATE INDEX idx_appointments_agent    ON public.appointments(agent_id);
CREATE INDEX idx_appointments_schedule ON public.appointments(scheduled_at);
