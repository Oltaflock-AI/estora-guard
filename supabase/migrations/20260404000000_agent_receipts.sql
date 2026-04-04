-- Migration: agent_receipts
-- Stores a receipt for every agent action — allowed, denied, or pending approval.
-- Append-only. Only permitted mutation: setting approved_by on approval.

-- Table
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

CREATE INDEX IF NOT EXISTS agent_receipts_transaction_id_idx
  ON agent_receipts (transaction_id);

CREATE INDEX IF NOT EXISTS agent_receipts_created_at_idx
  ON agent_receipts (created_at DESC);

CREATE INDEX IF NOT EXISTS agent_receipts_decision_idx
  ON agent_receipts (decision);

CREATE INDEX IF NOT EXISTS agent_receipts_attack_case_id_idx
  ON agent_receipts (attack_case_id)
  WHERE attack_case_id IS NOT NULL;

-- RLS
ALTER TABLE agent_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own receipts"
  ON agent_receipts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id::text = agent_receipts.transaction_id
        AND c.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "service role can insert receipts"
  ON agent_receipts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service role can approve receipts"
  ON agent_receipts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Scorecard view for the Scoreboard component
CREATE OR REPLACE VIEW agent_scorecard AS
SELECT
  transaction_id,
  COUNT(*)                                                          AS total_requests,
  COUNT(*) FILTER (WHERE decision = 'allowed')                     AS allowed_count,
  COUNT(*) FILTER (WHERE decision = 'denied')                      AS denied_count,
  COUNT(*) FILTER (WHERE decision = 'approval_required')           AS approval_required_count,
  COUNT(*) FILTER (WHERE attack_case_id IS NOT NULL)               AS attacks_run,
  COUNT(*) FILTER (
    WHERE attack_case_id IS NOT NULL
    AND decision IN ('denied', 'approval_required')
  )                                                                 AS attacks_blocked_or_gated,
  COUNT(*) FILTER (
    WHERE skill_requested = 'request_pii_reveal' AND decision = 'allowed'
  )                                                                 AS pii_reveals_allowed,
  COUNT(*) FILTER (
    WHERE skill_requested = 'request_pii_reveal' AND decision = 'denied'
  )                                                                 AS pii_reveals_denied
FROM agent_receipts
GROUP BY transaction_id;
