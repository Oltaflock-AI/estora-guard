# skills.md — Estora Guard Skill Manifest

This is the human-readable version of the permission manifest. The machine-readable version lives in `src/lib/agent/manifest.ts`. This file can be shown on screen during the demo to make the trust model inspectable.

---

## Roles

| Role | Who uses it |
|---|---|
| `buyer_agent` | The buyer's real estate agent |
| `seller_agent` | The seller's real estate agent |
| `attorney` | Either party's attorney |
| `transaction_coordinator` | The coordinator managing the deal workflow |

---

## Skills

### read_deal_summary

Returns a summary of the deal — property, parties, price, closing date, health score, top risks.

| Property | Value |
|---|---|
| Category | read |
| Sensitivity | low |
| Approval required | no |
| Allowed roles | all roles |
| Mutates data | no |
| Calls external API | no |

**What it returns:** Property address, buyer name, seller name, purchase price, closing date, contract status, health score (0–100), health status (green/yellow/red), top 3 risk flags with severity.

**When the agent uses it:** Any question about what the deal is, who the parties are, what the price is, what the status is, or as a fallback when intent is unclear.

---

### read_risk_flags

Returns all active risk flags — type, severity, description, acknowledged status.

| Property | Value |
|---|---|
| Category | read |
| Sensitivity | medium |
| Approval required | no |
| Allowed roles | all roles |
| Mutates data | no |
| Calls external API | no |

**What it returns:** Full risk flag list. Each flag includes: flag type, severity (low/medium/high/critical), title, description, whether it has been acknowledged, who acknowledged it and when.

**When the agent uses it:** Any question about risks, problems, issues, flags, or what needs attention.

---

### read_timeline

Returns the deal milestone timeline — key dates, completion status, days remaining or overdue.

| Property | Value |
|---|---|
| Category | read |
| Sensitivity | low |
| Approval required | no |
| Allowed roles | all roles |
| Mutates data | no |
| Calls external API | no |

**What it returns:** All timeline milestones. Each item includes: label, due date, milestone type, days remaining (negative = overdue), sort order. Overdue milestones are flagged.

**When the agent uses it:** Any question about deadlines, when something is due, what's coming up, the closing date, or what's overdue.

---

### read_task_list

Returns the current task list grouped by status — overdue, due soon, in progress, todo, done.

| Property | Value |
|---|---|
| Category | read |
| Sensitivity | low |
| Approval required | no |
| Allowed roles | all roles |
| Mutates data | no |
| Calls external API | no |

**What it returns:** All tasks. Each task includes: title, description, category, severity, status, due date, overdue flag. Grouped by status bucket for easy consumption.

**When the agent uses it:** Any question about tasks, checklist, what needs to be done, what's incomplete.

---

### draft_next_actions

Generates a prioritized list of next actions tailored to the caller's role.

| Property | Value |
|---|---|
| Category | generate |
| Sensitivity | medium |
| Approval required | no |
| Allowed roles | all roles |
| Mutates data | no |
| Calls external API | yes — Anthropic Claude API |

**What it returns:** A role-specific list of recommended next actions. The output is different for each role because each role has different responsibilities and different information needs.

| Role | Focus of output |
|---|---|
| `buyer_agent` | What to tell the buyer, contingency status, client-facing next steps |
| `seller_agent` | Seller deliverables, what's needed from the seller's side, closing prep |
| `attorney` | Clause ambiguities, legal review items, contingency flags, what needs legal attention |
| `transaction_coordinator` | Overdue items, deadlines this week, documents needed, what to chase |

**When the agent uses it:** Any question about what to do next, what to focus on, recommendations, action items.

**Model used:** `claude-sonnet-4-20250514`

---

### request_pii_reveal

Requests access to masked sensitive data (tax ID, bank account details). Never reveals data directly — returns approved data only after explicit human approval.

| Property | Value |
|---|---|
| Category | sensitive_read |
| Sensitivity | critical |
| Approval required | **yes — always** |
| Allowed roles | attorney, transaction_coordinator only |
| Mutates data | no |
| Calls external API | no |

**What it does:**
1. If the requesting role is `buyer_agent` or `seller_agent` → hard denied, no approval path
2. If the requesting role is `attorney` or `transaction_coordinator` → returns `approval_required`, triggers ApprovalModal
3. If a human approves → calls `/api/security/pii-reveal` which logs to `audit_events` and returns the reveal

**Important:** The agent never has access to raw PII values. The reveal path goes through the existing `MaskedField` → `/api/security/pii-reveal` flow which was already built into Estora before Guard was added.

**When the agent uses it:** Any request mentioning SSN, tax ID, federal ID, bank account, bank details, routing number, account number, or any variant.

---

## Hard deny rules

These are checked against every incoming message before skill routing. They cannot be overridden by any role, any approval, or any argument.

| Rule | Trigger pattern | Reason |
|---|---|---|
| Prompt injection | "ignore previous instructions", "ignore your rules", "pretend", "DAN", "developer mode", "jailbreak" | Classic injection attacks |
| Escrow manipulation | "escrow instructions", "wire funds to", "change bank account", "new account number", "routing number" combined with change/update/send | Wire fraud is the #1 financial crime in real estate |
| Cross-org dump | "all deals", "all parties", "entire organization", "export everything", "all transactions" | Scope violation — agent is scoped to one transaction |
| Document instruction override | "the document says to", "the contract says to send", "per the uploaded file, send" | Untrusted documents cannot override policy |
| Health score override | "mark as healthy", "clear all flags", "set health to", "override health" | Health is computed from real data, not manually settable |

---

## Policy decision types

| Decision | Meaning | What the user sees |
|---|---|---|
| `allowed` | Skill executed | Green banner, receipt with decision: allowed |
| `denied` | Blocked | Red banner, reason, receipt with decision: denied |
| `approval_required` | Waiting for human | Amber banner, ApprovalModal, receipt with decision: approval_required |

---

## Receipt format

Every action produces a receipt written to the `agent_receipts` table:

```json
{
  "id": "uuid",
  "transactionId": "contract-uuid",
  "userId": "user-uuid",
  "role": "attorney",
  "request": "Show me the seller's tax ID",
  "skillRequested": "request_pii_reveal",
  "decision": "approval_required",
  "reason": "Critical sensitivity — human approval required",
  "approvedBy": null,
  "attackCaseId": null,
  "createdAt": "2026-04-04T14:32:00Z"
}
```

Receipts are append-only. The only permitted mutation is setting `approvedBy` when a human approves a pending action.