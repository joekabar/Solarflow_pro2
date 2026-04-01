-- ============================================================
-- Call Forge Dialer — 07_rls_policies.sql
-- Team-aware Row Level Security
--
-- Access rules:
--   admin      → sees ALL data in their org
--   supervisor → sees only their team's data
--   agent      → sees only their locked contact + own call logs
-- ============================================================

-- ── Enable RLS ──────────────────────────────────────────────
ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_view_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc_list              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_telephony_state ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_org_id() RETURNS uuid AS $$
  SELECT org_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_role() RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_team_id() RETURNS uuid AS $$
  SELECT team_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Organizations ────────────────────────────────────────────
CREATE POLICY "org_own" ON public.organizations
  FOR ALL USING (id = auth_org_id());

-- ── Teams ────────────────────────────────────────────────────
CREATE POLICY "teams_read" ON public.teams
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "teams_admin_write" ON public.teams
  FOR ALL USING (org_id = auth_org_id() AND auth_role() = 'admin');

-- ── User Profiles ────────────────────────────────────────────
CREATE POLICY "profiles_own_org" ON public.user_profiles
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "profiles_admin_write" ON public.user_profiles
  FOR ALL USING (auth_role() = 'admin');

-- ── Campaigns: team-scoped ───────────────────────────────────
CREATE POLICY "campaigns_read" ON public.campaigns
  FOR SELECT USING (
    org_id = auth_org_id()
    AND (
      auth_role() = 'admin'
      OR team_id = auth_team_id()
      OR team_id IS NULL
    )
  );
CREATE POLICY "campaigns_write" ON public.campaigns
  FOR ALL USING (
    org_id = auth_org_id()
    AND auth_role() IN ('admin','supervisor')
  );

-- ── Contacts: agents see ONLY their locked contact ───────────
CREATE POLICY "contacts_read" ON public.contacts
  FOR SELECT USING (
    org_id = auth_org_id()
    AND (
      auth_role() IN ('admin','supervisor')
      OR locked_by = auth.uid()
    )
  );
CREATE POLICY "contacts_write" ON public.contacts
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT WITH CHECK (org_id = auth_org_id());

-- ── Call Logs ────────────────────────────────────────────────
CREATE POLICY "call_logs_read" ON public.call_logs
  FOR SELECT USING (
    org_id = auth_org_id()
    AND (
      auth_role() IN ('admin','supervisor')
      OR agent_id = auth.uid()
    )
  );
CREATE POLICY "call_logs_insert" ON public.call_logs
  FOR INSERT WITH CHECK (org_id = auth_org_id());

-- ── Contact View Log ─────────────────────────────────────────
CREATE POLICY "view_log_insert" ON public.contact_view_log
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "view_log_admin" ON public.contact_view_log
  FOR SELECT USING (
    org_id = auth_org_id()
    AND auth_role() IN ('admin','supervisor')
  );

-- ── Scripts ──────────────────────────────────────────────────
CREATE POLICY "scripts_read" ON public.scripts
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "scripts_write" ON public.scripts
  FOR ALL USING (
    org_id = auth_org_id()
    AND auth_role() IN ('admin','supervisor')
  );

-- ── Appointments ─────────────────────────────────────────────
CREATE POLICY "appointments_read" ON public.appointments
  FOR SELECT USING (
    org_id = auth_org_id()
    AND (
      auth_role() IN ('admin','supervisor')
      OR agent_id = auth.uid()
    )
  );
CREATE POLICY "appointments_write" ON public.appointments
  FOR ALL USING (org_id = auth_org_id());

-- ── DNC List ─────────────────────────────────────────────────
CREATE POLICY "dnc_read" ON public.dnc_list
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "dnc_insert" ON public.dnc_list
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "dnc_admin_delete" ON public.dnc_list
  FOR DELETE USING (
    org_id = auth_org_id()
    AND auth_role() IN ('admin','supervisor')
  );

-- ── Agent Telephony State ────────────────────────────────────
CREATE POLICY "agent_state_read" ON public.agent_telephony_state
  FOR SELECT USING (
    org_id = auth_org_id()
    AND (
      auth_role() IN ('admin','supervisor')
      OR agent_id = auth.uid()
    )
  );
CREATE POLICY "agent_state_write" ON public.agent_telephony_state
  FOR ALL USING (
    org_id = auth_org_id()
    AND (auth_role() IN ('admin','supervisor') OR agent_id = auth.uid())
  );

-- ── Service role gets full access (used by backend) ──────────
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
