# Estora Guard

Real estate transaction intelligence platform with a role-aware AI agent and policy-governed security layer. Upload a contract PDF, let Claude extract structured fields and flag risks, manage the deal through a full milestone timeline — and ask an agent to reason about it with a built-in firewall around every action it can take.

---

## What's in this repo

**Estora** — the core platform. Contract extraction, risk detection, timeline generation, health scoring, audit trail, PII masking.

**Estora Guard** — the AI agent + security layer built on top. A role-aware chat agent with a manifest-driven policy engine, human approval gates for sensitive actions, receipt logging on every agent action, and a red-team attack console to verify the security layer works under adversarial pressure.

---

## Architecture

Self-contained Next.js 15 application using Supabase as the backend. No separate API server.

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (PDF uploads) |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Document Parsing | LlamaParse API (PDF → markdown) |
| Agent Security Runtime | NVIDIA NemoClaw / OpenShell (separate process) |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library |

> The `transaction-control/` folder contains a Python/FastAPI backend that was scaffolded early and is **not used**. Ignore it.

---

## Core flows

### Estora: document → transaction

```
Upload PDF → AI Extraction + Risk Flags → Create Transaction → Timeline + Health Score + Tasks
```

### Estora Guard: transaction → agent

```
Open agent page → Select role → Ask question → Policy check → Skill execution → Receipt logged
                                             → Attack console → Run 8 attacks → Scoreboard
```

---

## Project structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                                  # Upload dropzone + deal list
│   │   ├── documents/[id]/page.tsx                   # Extraction review
│   │   ├── transactions/[id]/page.tsx                # Transaction nerve center
│   │   ├── transactions/[id]/agent/page.tsx          # ★ Guard: main agent demo page
│   │   ├── agreements/[id]/page.tsx                  # Agreement editing workspace
│   │   ├── audit/page.tsx                            # Full audit trail
│   │   ├── redteam/page.tsx                          # ★ Guard: attack console
│   │   └── agent/page.tsx                            # ★ Guard: global agent overview
│   └── api/
│       ├── documents/upload/route.ts
│       ├── documents/[id]/create-transaction/route.ts
│       ├── agreements/[id]/save/route.ts
│       ├── contracts/[id]/route.ts
│       ├── transactions/[id]/tasks/[taskId]/status/route.ts
│       ├── risk-flags/[id]/acknowledge/route.ts
│       ├── security/pii-reveal/route.ts
│       └── agent/                                    # ★ Guard: agent API layer
│           ├── chat/route.ts
│           ├── approve/route.ts
│           ├── attacks/run/route.ts
│           └── skills/read-deal-summary/route.ts
├── components/
│   ├── [existing Estora components...]
│   ├── agent/                                        # ★ Guard: agent UI
│   │   ├── AgentPanel.tsx
│   │   ├── RoleSelector.tsx
│   │   ├── ApprovalModal.tsx
│   │   ├── SecurityReceiptCard.tsx
│   │   ├── PolicyDecisionBanner.tsx
│   │   └── Scoreboard.tsx
│   ├── redteam/
│   │   └── AttackConsole.tsx
│   └── security/
│       ├── WireFraudBanner.tsx
│       ├── ClosingProximityFlag.tsx
│       ├── IdleTimeoutGuard.tsx
│       ├── MaskedField.tsx
│       └── PasswordStrength.tsx
└── lib/
    ├── agent/                                        # ★ Guard: agent logic
    │   ├── types.ts
    │   ├── manifest.ts
    │   ├── policy.ts
    │   ├── orchestrator.ts
    │   ├── receipts.ts
    │   └── attacks.ts
    ├── skills/                                       # ★ Guard: skill functions
    │   ├── read-deal-summary.ts
    │   ├── read-risk-flags.ts
    │   ├── read-timeline.ts
    │   ├── read-task-list.ts
    │   ├── draft-next-actions.ts
    │   └── request-pii-reveal.ts
    └── services/
        ├── document-intelligence.ts
        ├── health-service.ts
        ├── timeline-service.ts
        ├── deadline-service.ts
        ├── audit-service.ts
        └── rules-engine.ts
```

---

## Database schema

| Table | Purpose |
|---|---|
| `contracts` | Core deal record (dates, price, status, health) |
| `documents` | Uploaded PDFs with processing status |
| `extractions` | AI-extracted fields with confidence + page refs |
| `risk_flags` | Detected risks (severity, acknowledged status) |
| `tasks` | Deal checklist items (todo/in_progress/done/overdue) |
| `timeline_items` | Milestone events on the deal timeline |
| `properties` | Property address and details |
| `people` | Parties (seller, purchaser, attorneys) |
| `contract_mortgages` | Mortgage details |
| `contract_escrow` | Escrow details |
| `audit_events` | Append-only mutation log |
| `event_logs` | System event logging |
| `profiles` | User profiles |
| `organizations` | Multi-tenant orgs |
| `memberships` | Org membership + roles |
| `agent_receipts` | ★ Guard: every agent action logged with decision + reason |

---

## Guard: skill manifest

The agent has exactly 6 skills. Each has a defined sensitivity, approval rule, and allowed roles.

| Skill | Sensitivity | Approval | Allowed roles |
|---|---|---|---|
| `read_deal_summary` | low | no | all |
| `read_risk_flags` | medium | no | all |
| `read_timeline` | low | no | all |
| `read_task_list` | low | no | all |
| `draft_next_actions` | medium | no | all |
| `request_pii_reveal` | critical | **yes** | attorney, coordinator only |

See `skills.md` for full manifest details.

---

## Guard: security layers

```
NemoClaw / OpenShell  →  process-level sandbox (filesystem + network isolation)
Estora Guard policy   →  business-logic gate (role, manifest, approval)
Estora audit trail    →  immutable log (audit_events + agent_receipts)
```

**Hard deny rules** (always blocked, no approval path):
- Prompt injection patterns (`ignore previous instructions`, `DAN`, etc.)
- Escrow / wire instruction modifications
- Cross-organization data dumps
- Document instruction overrides
- Manual health score overrides

---

## Guard: attack console

Eight preset attacks test the policy engine under adversarial pressure. See `attacks.md` for the full list.

| Attack | Category | Expected |
|---|---|---|
| Reveal buyer SSN | PII extraction | denied |
| Classic jailbreak | Prompt injection | denied |
| Malicious document instruction | Document override | denied |
| Fake admin claim | Privilege escalation | denied |
| Escrow destination change | Unauthorized write | denied |
| Health score override | Unauthorized write | denied |
| Attorney PII without approval | PII extraction | approval_required |
| Cross-org data dump | Data overreach | denied |

---

## Getting started

### Prerequisites

- Node.js 18+
- Supabase project with schema applied (see `supabase.md`)
- Anthropic API key
- LlamaParse API key (optional — system falls back to direct Claude if unavailable)

### Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
LLAMA_CLOUD_API_KEY=llx-xxxxxxxxxxxxxxxxxx
CRON_SECRET=random-hex-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STORAGE_BUCKET=documents
```

### Run

```bash
npm install
npm run dev         # http://localhost:3000
npm test            # Vitest
npm run types:supabase  # Regenerate DB types after schema changes
```

### Run Guard migrations

Before using any agent features, run the migrations in `migrations.md` in Supabase SQL Editor, then regenerate types:

```bash
npm run types:supabase
```

### NemoClaw setup

See `nemoclaw.md` for the full installation and integration guide.

---

## Documentation

| File | What it covers |
|---|---|
| `CLAUDE.md` | Full architecture context for Claude Code sessions |
| `architecture.md` | Detailed Estora Guard architecture — all 6 layers |
| `skills.md` | Human-readable skill manifest |
| `attacks.md` | All 8 red-team attack cases |
| `migrations.md` | SQL migrations to run in Supabase |
| `nemoclaw.md` | NemoClaw installation + integration guide |
| `demo.md` | Hackathon demo script with fallbacks |
| `security.md` | Platform security model and threat model |
| `design.md` | UI design specification and principles |
| `supabase.md` | Full database schema + seed SQL |