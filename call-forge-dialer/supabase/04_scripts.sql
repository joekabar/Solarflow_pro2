-- ============================================================
-- Call Forge Dialer — 04_scripts.sql
-- Branching call scripts (JSONB tree structure)
-- ============================================================

CREATE TABLE public.scripts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id),
  campaign_id uuid REFERENCES public.campaigns(id),
  name        text NOT NULL,
  language    text NOT NULL DEFAULT 'nl',
  content     jsonb NOT NULL,  -- branching tree: { steps: [{id, text, branches: [{label, next|outcome}]}] }
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Now safe to add FK from campaigns → scripts (scripts table exists now)
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_script_id_fk
  FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;
