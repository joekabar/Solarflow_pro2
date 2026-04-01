-- ============================================================
-- Call Forge Dialer — 01_schema.sql
-- Core tables: organizations, teams, user_profiles, campaigns
-- Run in Supabase SQL Editor (order matters: run 01 → 09)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ──────────────────────────────────────────
CREATE TABLE public.organizations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  country              text NOT NULL DEFAULT 'BE'
                         CHECK (country IN ('BE','NL','FR','DE')),
  plan                 text NOT NULL DEFAULT 'trial'
                         CHECK (plan IN ('trial','starter','pro','enterprise')),
  trial_ends_at        timestamptz DEFAULT now() + interval '14 days',
  seat_limit           int  NOT NULL DEFAULT 7,
  is_active            boolean NOT NULL DEFAULT true,
  contact_interval_sec int  NOT NULL DEFAULT 45
                         CHECK (contact_interval_sec BETWEEN 10 AND 300),
  -- Telephony
  telephony_provider              text DEFAULT 'manual'
    CHECK (telephony_provider IN ('manual','voiptiger')),
  telephony_credentials_encrypted text,
  telephony_phone_number          text,
  telephony_configured_at         timestamptz,
  -- Audio settings (org-level defaults, from Adversus analysis)
  enable_dial_tone         boolean DEFAULT true,
  mute_audio_between_calls boolean DEFAULT true,
  agc                      boolean DEFAULT false,
  echo_cancellation        boolean DEFAULT true,
  noise_suppression        boolean DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

-- ── Teams ──────────────────────────────────────────────────
CREATE TABLE public.teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ── User Profiles ──────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES public.organizations(id),
  team_id     uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  role        text NOT NULL DEFAULT 'agent'
                CHECK (role IN ('admin','supervisor','agent')),
  full_name   text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ── Campaigns ──────────────────────────────────────────────
CREATE TABLE public.campaigns (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES public.organizations(id),
  team_id                 uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  script_id               uuid,   -- FK added after scripts table in 04_scripts.sql
  name                    text NOT NULL,
  status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','paused','completed')),
  -- Dialing mode
  dial_mode               text NOT NULL DEFAULT 'preview'
                            CHECK (dial_mode IN ('preview','power','manual')),
  max_attempts            int NOT NULL DEFAULT 5,
  max_attempts_redial     int NOT NULL DEFAULT 10,
  timezone                text NOT NULL DEFAULT 'Europe/Brussels',
  calling_hours_start     time NOT NULL DEFAULT '09:00',
  calling_hours_end       time NOT NULL DEFAULT '20:00',
  contact_interval_sec    int CHECK (contact_interval_sec BETWEEN 10 AND 300),
  -- Power/Progressive settings (from Adversus IQ5 config)
  max_ring_time           int NOT NULL DEFAULT 30,
  countdown_active        boolean NOT NULL DEFAULT false,
  countdown_duration_sec  int NOT NULL DEFAULT 5,
  pause_on_invalid_call   boolean NOT NULL DEFAULT false,
  private_redial_default  boolean NOT NULL DEFAULT true,
  -- Caller ID & recording
  caller_id               text,
  recording_mode          text NOT NULL DEFAULT 'always'
                            CHECK (recording_mode IN ('always','never','on_demand','on_activated')),
  created_at              timestamptz DEFAULT now()
);
