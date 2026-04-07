# migrations.md — Database Migrations for Estora Guard

Run these migrations in Supabase before building any agent routes. Without the `agent_receipts` table the chat API route will fail on every request.

---

## How to run migrations

Go to your Supabase project → SQL Editor → New query → paste the migration → Run.

---

## Migration 001 — agent_receipts table

This is the only new table required for the Guard layer. Everything else reuses existing tables.

```sql
-- Migration: 001_agent_receipts
-- Purpose: Stores a receipt for every agent action — allowed, denied, or pending approval.
-- This table is append-only. Never delete rows. The only permitted mutation is
-- updating approved_by when a pending action is approved.

CREATE TABLE IF NOT EXISTS agent_receipts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  text,
  user_id         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  role            text        NOT NULL,
  request         text        NOT NULL,
  skill_requested text        NOT NULL,
  decision        text        NOT NULL
                              CHECK (decision IN ('allowed', 'denied', 'approval_required')),
  reason          text,
  approved_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  attack_case_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Query indexes
CREATE INDEX IF NOT EXISTS agent_receipts_transaction_id_idx
  ON agent_receipts (transaction_id);

CREATE INDEX IF NOT EXISTS agent_receipts_created_at_idx
  ON agent_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS agent_receipts_decision_idx
  ON agent_receipts (decision);

CREATE INDEX IF NOT EXISTS agent_receipts_attack_case_id_idx
  ON agent_receipts (attack_case_id)
  WHERE attack_case_id IS NOT NULL;
```

---

## Migration 002 — RLS policies for agent_receipts

```sql
-- Migration: 002_agent_receipts_rls
-- Enable RLS so users can only read receipts for their own org's transactions.

ALTER TABLE agent_receipts ENABLE ROW LEVEL SECURITY;

-- Users can read receipts linked to transactions in their org
CREATE POLICY "users can read own receipts"
  ON agent_receipts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    -- Allow reading receipts for transactions the user has access to
    -- (adjust this join if your RLS model differs)
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id::text = agent_receipts.transaction_id
        AND c.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
    )
  );

-- Service role can insert receipts (all agent API routes use service client)
CREATE POLICY "service role can insert receipts"
  ON agent_receipts
  FOR INSERT
  WITH CHECK (true);

-- Service role can update approved_by only
CREATE POLICY "service role can approve receipts"
  ON agent_receipts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

---

## Migration 003 — Scorecard view (optional but useful for Scoreboard component)

```sql
-- Migration: 003_agent_scorecard_view
-- Provides aggregated stats for the Scoreboard component.
-- Query this view instead of aggregating in application code.

CREATE OR REPLACE VIEW agent_scorecard AS
SELECT
  transaction_id,
  COUNT(*)                                        AS total_requests,
  COUNT(*) FILTER (WHERE decision = 'allowed')    AS allowed_count,
  COUNT(*) FILTER (WHERE decision = 'denied')     AS denied_count,
  COUNT(*) FILTER (WHERE decision = 'approval_required') AS approval_required_count,
  COUNT(*) FILTER (WHERE attack_case_id IS NOT NULL)      AS attacks_run,
  COUNT(*) FILTER (
    WHERE attack_case_id IS NOT NULL
    AND decision IN ('denied', 'approval_required')
  )                                               AS attacks_blocked_or_gated,
  COUNT(*) FILTER (
    WHERE skill_requested = 'request_pii_reveal'
    AND decision = 'allowed'
  )                                               AS pii_reveals_allowed,
  COUNT(*) FILTER (
    WHERE skill_requested = 'request_pii_reveal'
    AND decision = 'denied'
  )                                               AS pii_reveals_denied
FROM agent_receipts
GROUP BY transaction_id;
```

---

## Migration 004 — waitlist_signups (public marketing / WAITLIST_ONLY mode)

Run this when you want to collect emails from the landing page while the rest of the app is gated off.

```sql
-- Migration: 004_waitlist_signups
-- Append-only interest list. API route uses service role to insert.
-- No policies for anon/authenticated SELECT/INSERT — only service role writes.

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
-- Intentionally no GRANT to anon/authenticated for this table in app code.
```

---

## After running migrations

Regenerate TypeScript types:

```bash
npm run types:supabase
```

This updates `src/lib/supabase/database.types.ts` with new tables (e.g. `agent_receipts`, `waitlist_signups`).

---

## Rollback

If you need to undo these migrations:

```sql
-- Rollback migration 003
DROP VIEW IF EXISTS agent_scorecard;

-- Rollback migration 002
DROP POLICY IF EXISTS "users can read own receipts" ON agent_receipts;
DROP POLICY IF EXISTS "service role can insert receipts" ON agent_receipts;
DROP POLICY IF EXISTS "service role can approve receipts" ON agent_receipts;
ALTER TABLE agent_receipts DISABLE ROW LEVEL SECURITY;

-- Rollback migration 001
DROP TABLE IF EXISTS agent_receipts;

-- Rollback migration 004
DROP TABLE IF EXISTS waitlist_signups;
```