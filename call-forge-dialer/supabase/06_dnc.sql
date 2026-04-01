-- ============================================================
-- Call Forge Dialer — 06_dnc.sql
-- GDPR-compliant Do Not Call list
-- Belgian telemarketing law: must respect opt-outs immediately
-- ============================================================

CREATE TABLE public.dnc_list (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id),
  phone      text NOT NULL,    -- normalised: digits only, BE format 32XXXXXXXXX
  reason     text,
  added_by   uuid REFERENCES public.user_profiles(id),
  added_at   timestamptz DEFAULT now(),
  UNIQUE (org_id, phone)
);

-- Fast lookup used in next_contact.py DNC skip loop
CREATE INDEX idx_dnc_lookup ON public.dnc_list(org_id, phone);
