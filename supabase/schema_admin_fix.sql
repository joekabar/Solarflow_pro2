-- ============================================================
-- SolarFlow Pro — Admin Fix Migration
-- Run this in your Supabase SQL Editor (Settings → SQL Editor)
-- ============================================================

-- 1. Add is_platform_admin flag to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

-- 2. Add branding columns to organizations (used by login + platform admin)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#1d6fb8';

-- ============================================================
-- After running: promote your superadmin user.
-- Replace <your-user-uuid> with the UUID from auth.users
-- ============================================================
-- UPDATE public.user_profiles
--   SET is_platform_admin = true
--   WHERE id = '<your-user-uuid>';
