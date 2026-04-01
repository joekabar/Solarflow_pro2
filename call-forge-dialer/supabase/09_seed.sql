-- ============================================================
-- Call Forge Dialer — 09_seed.sql
-- Development seed data
--
-- HOW TO USE:
--   1. Run migrations 01–08 first
--   2. Create your Supabase auth user via the app login page
--   3. Uncomment step 3 and replace <your-auth-user-uuid>
--   4. Run this file
-- ============================================================

-- 1. Create demo org
INSERT INTO public.organizations (id, name, country, plan, seat_limit, telephony_provider)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Call Forge Demo',
  'BE',
  'pro',
  7,
  'manual'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create demo team
INSERT INTO public.teams (id, org_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Sales Team Alpha'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create your admin user profile
--
--    STEP A: Sign up (or add a user) via Supabase Dashboard
--            → Authentication → Users → "Add user"
--
--    STEP B: Copy your UUID from the "User UID" column
--            It looks like: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--            Do NOT use your email address — the id column is a UUID.
--
--    STEP C: Uncomment the INSERT below, paste your UUID, and run it
--            in the Supabase SQL Editor (it runs as service role,
--            so RLS is bypassed automatically).
--
-- INSERT INTO public.user_profiles (id, org_id, team_id, role, full_name)
-- VALUES (
--   'paste-your-uuid-here',                      -- ← UUID from step B
--   '00000000-0000-0000-0000-000000000001',       -- demo org
--   '00000000-0000-0000-0000-000000000010',       -- Sales Team Alpha
--   'admin',
--   'Jochen Sacre'
-- );

-- 4. Create demo campaign
INSERT INTO public.campaigns (
  id, org_id, team_id, name, dial_mode,
  max_attempts, timezone, calling_hours_start, calling_hours_end,
  max_ring_time, recording_mode, caller_id
)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Demo — Belgium Cold Call',
  'preview',
  5,
  'Europe/Brussels',
  '09:00',
  '20:00',
  30,
  'always',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- 5. Demo script (Dutch)
INSERT INTO public.scripts (
  id, org_id, campaign_id, name, language, content
)
VALUES (
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000100',
  'Standaard cold call script',
  'nl',
  '{
    "steps": [
      {
        "id": "intro",
        "text": "Goedemiddag, spreek ik met {first_name}? Ik bel namens {company}.",
        "branches": [
          {"label": "Geïnteresseerd", "next": "qualify"},
          {"label": "Niet geïnteresseerd", "next": "objection"},
          {"label": "Terugbellen", "next": "callback"},
          {"label": "Verkeerd nummer", "outcome": "invalid"}
        ]
      },
      {
        "id": "qualify",
        "text": "Geweldig! Mag ik u een paar korte vragen stellen?",
        "branches": [
          {"label": "Ja, ga verder", "next": "close"},
          {"label": "Nee, geen tijd", "next": "callback"}
        ]
      },
      {
        "id": "close",
        "text": "Ik zou graag een afspraak maken. Wanneer schikt het u?",
        "branches": [
          {"label": "Afspraak maken", "outcome": "success"},
          {"label": "Eerst nadenken", "next": "callback"}
        ]
      },
      {
        "id": "objection",
        "text": "Dat begrijp ik. Mag ik vragen waarom niet?",
        "branches": [
          {"label": "Toch geïnteresseerd", "next": "close"},
          {"label": "Echt niet", "outcome": "not_interested"},
          {"label": "Niet de juiste persoon", "outcome": "unqualified"}
        ]
      },
      {
        "id": "callback",
        "text": "Geen probleem! Wanneer kan ik u beter terugbellen?",
        "branches": [
          {"label": "Morgen ochtend", "outcome": "callback_private"},
          {"label": "Volgende week", "outcome": "callback_shared"},
          {"label": "Bel niet meer", "outcome": "dnc"}
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 6. Link script to campaign
UPDATE public.campaigns
SET script_id = '00000000-0000-0000-0000-000000001000'
WHERE id = '00000000-0000-0000-0000-000000000100';

-- 7. Sample Belgian contacts for testing
INSERT INTO public.contacts (org_id, campaign_id, first_name, last_name, phone, company, lead_score)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'Jan',    'Janssens',   '+32470000001', 'Bakkerij Janssens',   75),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'Marie',  'Peeters',    '+32470000002', 'Peeters BVBA',        60),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'Luc',    'Vandenberg', '+32470000003', NULL,                  50),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'Sophie', 'De Smedt',   '+32470000004', 'De Smedt Consulting', 85),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'Thomas', 'Willems',    '+32470000005', 'Willems NV',          40)
ON CONFLICT DO NOTHING;
