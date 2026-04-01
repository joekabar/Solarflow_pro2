# Call Forge Dialer — Setup Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/) installed

---

## 1. Clone the repository

```bash
git clone https://github.com/joekabar/Solarflow_pro2.git
cd Solarflow_pro2/call-forge-dialer
```

---

## 2. Create your `.env` file

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and fill in the two Supabase keys:

```
SUPABASE_ANON_KEY=<your anon/public key>
SUPABASE_SERVICE_KEY=<your service role key>
```

Find both keys in your Supabase project:
**Dashboard → Project Settings → API → Project API keys**

The `CREDENTIAL_ENCRYPTION_KEY` is already pre-filled — keep it as-is
(it encrypts your VoIP Tiger SIP credentials at rest).

---

## 3. Run the SQL migrations

Open your Supabase project → **SQL Editor** → run each file in order:

| File | What it creates |
|------|----------------|
| `supabase/01_schema.sql` | Core tables (orgs, teams, profiles, campaigns) |
| `supabase/02_contacts.sql` | Contacts table + priority queue indexes |
| `supabase/03_call_logs.sql` | Call logs, agent state |
| `supabase/04_scripts.sql` | Branching scripts |
| `supabase/05_appointments.sql` | Appointments |
| `supabase/06_dnc.sql` | Do-not-call list |
| `supabase/07_rls_policies.sql` | Row Level Security policies |
| `supabase/08_functions.sql` | `get_next_contact()` RPC + lock cleanup |
| `supabase/09_seed.sql` | Demo org, team, campaign, script, 5 contacts |

Paste the content of each file into the SQL Editor and click **Run**.
Run them strictly in order (01 → 09).

---

## 4. Create your first admin user

### Step A — Sign up

Option 1 (easiest): Go to Supabase Dashboard → **Authentication → Users → Add user**,
enter your email and a password.

Option 2: Start the app first (step 5) and sign up via the login page.

### Step B — Find your UUID

Supabase Dashboard → **Authentication → Users** → find your user →
copy the value in the **User UID** column.

It looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

> **Important:** This is a UUID, not your email address.

### Step C — Insert your admin profile

Open Supabase SQL Editor, paste and run:

```sql
INSERT INTO public.user_profiles (id, org_id, team_id, role, full_name)
VALUES (
  'paste-your-uuid-here',                      -- ← UUID from step B
  '00000000-0000-0000-0000-000000000001',       -- demo org
  '00000000-0000-0000-0000-000000000010',       -- Sales Team Alpha
  'admin',
  'Your Name'
);
```

---

## 5. Start the app

```bash
docker-compose up --build
```

First build takes ~3 minutes. Once running:

| URL | What you see |
|-----|-------------|
| `http://localhost` | Login page (Dutch dark theme) |
| `http://localhost:8000/api/health` | `{"status":"ok"}` |

Log in with the email and password you created in step 4.

---

## 6. Configure VoIP Tiger (optional — needed for live calls)

Log in as admin → **Admin Panel → Telephony** tab → enter your SIP credentials:

- **SIP Domain** — e.g. `sip.voiptiger.com`
- **WebSocket URL** — e.g. `wss://sip.voiptiger.com:8089/ws`
- **SIP Username** and **SIP Password**

Credentials are encrypted with Fernet before being stored in Supabase.

---

## Directory structure

```
call-forge-dialer/
├── backend/          FastAPI backend (Python)
├── frontend/         React 18 frontend (Vite + JsSIP)
├── supabase/         SQL migration files (01–09)
├── docker-compose.yml
├── .env.example      Copy to .env and fill in keys
└── SETUP.md          This file
```
