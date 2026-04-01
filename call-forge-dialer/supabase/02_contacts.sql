-- ============================================================
-- Call Forge Dialer — 02_contacts.sql
-- Generic contacts with custom_fields JSONB + priority queue statuses
-- ============================================================

CREATE TABLE public.contacts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id           uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,

  -- Basic info
  first_name            text,
  last_name             text,
  phone                 text NOT NULL,        -- E.164 (+32...)
  email                 text,
  company               text,
  address               text,

  -- Flexible per-campaign data (extra columns from CSV import)
  custom_fields         jsonb DEFAULT '{}'::jsonb,

  -- Lead scoring (0-100)
  lead_score            int DEFAULT 50 CHECK (lead_score BETWEEN 0 AND 100),

  -- Queue/locking — Adversus-style lead lifecycle statuses
  status                text NOT NULL DEFAULT 'available'
                          CHECK (status IN (
                            'available',
                            'locked',
                            'success',
                            'vip_callback',
                            'callback_private',
                            'callback_shared',
                            'auto_redial',
                            'not_interested',
                            'unqualified',
                            'invalid',
                            'voicemail',
                            'dnc',
                            'busy'
                          )),
  locked_by             uuid REFERENCES public.user_profiles(id),
  locked_at             timestamptz,
  lock_expires_at       timestamptz,

  -- Callback tracking
  callback_at           timestamptz,
  callback_agent_id     uuid REFERENCES public.user_profiles(id),  -- for private callbacks

  -- Call tracking
  last_called_at        timestamptz,
  last_outcome          text,
  called_by             uuid REFERENCES public.user_profiles(id),
  call_count            int NOT NULL DEFAULT 0,

  -- Source
  lead_source           text DEFAULT 'import',
  imported_at           timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now(),

  -- Same phone can exist in multiple campaigns, but NOT twice in the same campaign
  CONSTRAINT contacts_org_campaign_phone_unique UNIQUE (org_id, campaign_id, phone)
);

-- Priority queue index: covers ORDER BY in get_next_contact
CREATE INDEX idx_contacts_priority_queue ON public.contacts
  (org_id, campaign_id, status, lead_score DESC, created_at ASC);

-- Callback due index
CREATE INDEX idx_contacts_callbacks ON public.contacts
  (org_id, campaign_id, status, callback_at)
  WHERE status IN ('vip_callback','callback_private','callback_shared');

-- Auto-redial index
CREATE INDEX idx_contacts_auto_redial ON public.contacts
  (org_id, campaign_id, status, call_count)
  WHERE status = 'auto_redial';

-- Lock expiry index (for cleanup job)
CREATE INDEX idx_contacts_lock_expiry ON public.contacts (lock_expires_at)
  WHERE locked_by IS NOT NULL;
