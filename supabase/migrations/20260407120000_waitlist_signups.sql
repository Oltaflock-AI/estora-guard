-- Migration: waitlist_signups (landing / WAITLIST_ONLY)
-- Matches migrations.md 004 + 005. API uses service role to insert.

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  name       text,
  source     text        NOT NULL DEFAULT 'landing',
  referrer   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_lower_idx
  ON waitlist_signups (lower(email));

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Extended landing form fields (role, company, deal volume, pain point)
ALTER TABLE waitlist_signups
  ADD COLUMN IF NOT EXISTS signup_metadata jsonb DEFAULT '{}'::jsonb;
