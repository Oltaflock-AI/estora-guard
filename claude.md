# CLAUDE.md — Estora Guard

This file is the persistent context for every Claude Code session on this repo.
Read it fully before touching any file. Read `architecture.md` before touching any agent or skill file.

---

## What this product is

**Estora** is a real estate transaction intelligence platform. The core loop:

1. Agent uploads a contract PDF
2. LlamaParse converts the PDF to structured text, then Claude extracts fields and flags risks (automatic fallback to direct PDF → Claude if LlamaParse is unavailable)
3. Claude flags risks — short inspection windows, missing clauses, ambiguous language
4. A transaction is auto-created with full party records, property, mortgage, escrow, timeline, and health score
5. The agent manages the deal through task completion, timeline tracking, and agreement editing
6. Every action is logged to an append-only audit trail

**Estora Guard** is the AI agent + security layer built on top of Estora. It adds:

1. A role-aware chat agent that answers questions about a deal, summarizes it, and recommends next actions
2. A policy-governed skill firewall that controls exactly what the agent can do — with approval gates, hard denials, and full receipt logging
3. A red-team attack console that lets anyone try to break the system and see the result in real time

Read `architecture.md` for the full Guard design before writing any agent code.

---

## Architecture

This is a **self-contained Next.js 15 application** using **Supabase** as the backend. There is no separate API server.

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase PostgreSQL with Row-Level Security
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (PDF uploads)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Document Parsing:** LlamaParse API (PDF → markdown pre-processing)
- **Agent Security Runtime:** NVIDIA NemoClaw / OpenShell (separate process — not imported into Next.js)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library

> **The `transaction-control/` folder is legacy.** It contains a Python/FastAPI backend that was the original plan but is completely unused. The frontend has zero imports or API calls to it. Ignore it.

---

## Repo structure

```
src/
├── app/
│   ├── page.tsx                                    # Landing page
│   ├── layout.tsx                                  # Root layout (fonts, theme)
│   ├── globals.css                                 # Design tokens + animations
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                                # Upload dropzone + deal list
│   │   ├── documents/[id]/page.tsx                 # Extraction review
│   │   ├── transactions/[id]/page.tsx              # Transaction nerve center
│   │   ├── transactions/[id]/TransactionDetail.tsx
│   │   ├── transactions/[id]/agent/page.tsx        # ★ GUARD: Main agent demo page
│   │   ├── agreements/[id]/page.tsx                # Agreement editing workspace
│   │   ├── audit/page.tsx                          # Full audit trail
│   │   ├── redteam/page.tsx                        # ★ GUARD: Attack console
│   │   └── agent/page.tsx                          # ★ GUARD: Global agent overview
│   └── api/
│       ├── documents/upload/route.ts               # PDF upload + Claude extraction
│       ├── documents/[id]/create-transaction/route.ts
│       ├── agreements/[id]/save/route.ts           # Atomic agreement updates
│       ├── contracts/[id]/route.ts                 # Delete contract + cascade
│       ├── transactions/[id]/tasks/[taskId]/status/route.ts
│       ├── risk-flags/[id]/acknowledge/route.ts
│       ├── security/pii-reveal/route.ts
│       └── agent/                                  # ★ GUARD: Agent API layer
│           ├── chat/route.ts                       # Main orchestration endpoint
│           ├── approve/route.ts                    # Approval execution
│           ├── attacks/run/route.ts                # Red-team runner
│           └── skills/
│               └── read-deal-summary/route.ts      # Called by NemoClaw/OpenClaw skill
├── components/
│   ├── DocumentDropzone.tsx
│   ├── DealList.tsx
│   ├── ExtractionViewer.tsx
│   ├── RiskFlagPanel.tsx
│   ├── TimelineView.tsx
│   ├── TaskList.tsx
│   ├── HealthBar.tsx
│   ├── EditCanvas.tsx
│   ├── ValidationPanel.tsx
│   ├── SectionNavigator.tsx
│   ├── AuditTrail.tsx
│   ├── DashboardShell.tsx
│   ├── RealtimeRefresh.tsx
│   ├── ErrorBoundary.tsx
│   ├── OfflineBanner.tsx
│   ├── MobileReadOnlyGuard.tsx
│   ├── agent/                                      # ★ GUARD: Agent UI components
│   │   ├── AgentPanel.tsx
│   │   ├── RoleSelector.tsx
│   │   ├── ApprovalModal.tsx
│   │   ├── SecurityReceiptCard.tsx
│   │   ├── PolicyDecisionBanner.tsx
│   │   └── Scoreboard.tsx
│   ├── redteam/                                    # ★ GUARD: Attack console
│   │   └── AttackConsole.tsx
│   ├── security/
│   │   ├── WireFraudBanner.tsx
│   │   ├── ClosingProximityFlag.tsx
│   │   ├── IdleTimeoutGuard.tsx
│   │   ├── MaskedField.tsx
│   │   └── PasswordStrength.tsx
│   └── ui/
│       ├── Badge.tsx
│       └── Skeleton.tsx
└── lib/
    ├── types.ts                                    # Type aliases from database.types.ts
    ├── utils.ts                                    # Formatting helpers
    ├── auth-helpers.ts
    ├── agreement-schema.ts
    ├── contract-lockdown.ts
    ├── rate-limit.ts
    ├── agent/                                      # ★ GUARD: Agent logic
    │   ├── types.ts                                # AgentRole, SkillName, PolicyDecision, SecurityReceipt
    │   ├── manifest.ts                             # Skill permission manifest (source of truth)
    │   ├── policy.ts                               # Policy evaluation engine
    │   ├── orchestrator.ts                         # Intent → skill routing
    │   ├── receipts.ts                             # Receipt read/write
    │   └── attacks.ts                              # 8 preset attack cases
    ├── skills/                                     # ★ GUARD: Skill functions
    │   ├── read-deal-summary.ts
    │   ├── read-risk-flags.ts
    │   ├── read-timeline.ts
    │   ├── read-task-list.ts
    │   ├── draft-next-actions.ts
    │   └── request-pii-reveal.ts
    ├── supabase/
    │   ├── client.ts
    │   ├── server.ts
    │   └── database.types.ts                       # Auto-generated (npm run types:supabase)
    └── services/
        ├── document-intelligence.ts
        ├── health-service.ts
        ├── timeline-service.ts
        ├── deadline-service.ts
        ├── audit-service.ts
        └── rules-engine.ts
```

Files marked ★ GUARD are new. Everything else already exists.

---

## Database schema (Supabase)

### Existing tables

| Table                           | Purpose                                              |
|---------------------------------|------------------------------------------------------|
| `contracts`                     | Core deal record (dates, price, status, health)      |
| `documents`                     | Uploaded PDFs with processing status                 |
| `extractions`                   | AI-extracted fields with confidence + page refs      |
| `risk_flags`                    | Detected risks (severity, acknowledged status)       |
| `tasks`                         | Deal checklist items (todo/in_progress/done/overdue) |
| `timeline_items`                | Milestone events on the deal timeline                |
| `properties`                    | Property address and details                         |
| `people`                        | Parties (seller, purchaser, attorneys)               |
| `contract_mortgages`            | Mortgage details linked to contracts                 |
| `contract_escrow`               | Escrow details linked to contracts                   |
| `contract_personal_property`    | Personal property included in sale                   |
| `contract_permitted_exceptions` | Title exceptions                                     |
| `contract_violations`           | Known property violations                            |
| `contract_closing_conditions`   | Closing conditions                                   |
| `contract_apportionments`       | Tax/utility apportionments                           |
| `audit_events`                  | Append-only mutation log                             |
| `event_logs`                    | System event logging                                 |
| `profiles`                      | User profiles                                        |
| `organizations`                 | Multi-tenant orgs                                    |
| `memberships`                   | Org membership + roles                               |
| `agent_receipts`                | Append-only log of every agent action (allowed / denied / approval_required) |
| `waitlist_signups`              | Public landing-page email capture (waitlist mode)    |

### After any schema change

Run `supabase db push` to apply, then `npm run types:supabase` to regenerate `database.types.ts`. Don't hand-edit `database.types.ts`.

---

## Architecture rules

### Data access

**All database operations go through Supabase clients.** Two clients exist:

- `createClient()` in `lib/supabase/server.ts` — uses the anon key, respects RLS, tied to the user's session
- `createServiceClient()` in `lib/supabase/server.ts` — uses the service role key, bypasses RLS, used in API routes that need cross-org access

Never instantiate Supabase clients outside of these two functions. Skills receive a typed Supabase client as a parameter — they never create their own.

### Services

Services in `lib/services/` are stateless functions. They receive a typed Supabase client and return data. Skills in `lib/skills/` follow the same pattern. No service or skill creates its own client.

### Agent layer rules

**Policy is enforced on the server, not the client.**
The `ApprovalModal` is a UI hint. The real gate is `policy.ts` running inside the API route. Any request that bypasses the UI and calls the API directly must still be blocked by the policy engine. Never rely on client-side role checks for security.

**Skills call existing services — they do not duplicate logic.**
`read-deal-summary.ts` calls `computeHealthScore()` from `health-service.ts`. It does not re-implement health scoring. Skills are thin wrappers that gather data and pass it to the right service.

**Every write action calls `createAuditEvent()` in addition to logging a receipt.**
The agent receipt (in `agent_receipts`) records what the agent tried to do. The audit event (in `audit_events`) records what actually changed in the system. Both must be written for any mutation.

**The demo critical path must never break.**
Agent pages are additive. If the agent is broken, the existing transaction page still works. Never import agent code into `transactions/[id]/page.tsx` or any existing route.

**Receipts and audit events are append-only.**
Never update or delete `agent_receipts` rows, except for the single allowed mutation: updating `approved_by` when an action is approved. Use a targeted column update (`supabase.from('agent_receipts').update({ approved_by: userId }).eq('id', receiptId)`), not a general row update.

### Types

All types are derived from the auto-generated `database.types.ts`. The `lib/types.ts` file re-exports row types with friendly aliases. Agent-specific types (`AgentRole`, `SkillName`, `PolicyDecision`, `SecurityReceipt`) live in `lib/agent/types.ts`.

### AI model

```typescript
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;
```

Same model used everywhere. `draft_next_actions` is the only skill that calls the Anthropic API. All other skills read from the database. API key is read from `ANTHROPIC_API_KEY` env var — never hardcoded.

### Document parsing pipeline

PDF extraction is a two-stage pipeline with automatic fallback:

1. **LlamaParse** (single-call `/api/v1/parsing/upload` → poll → fetch markdown) converts the PDF to clean markdown text
2. **Claude** extracts structured fields and risk flags from the markdown

If LlamaParse fails or returns insufficient text (<50 chars), the system falls back to sending the raw PDF directly to Claude. All parsing logic lives in `lib/services/document-intelligence.ts`. No other file calls the Anthropic API except `lib/skills/draft-next-actions.ts`.

### Jurisdiction support

**The product is PA-only right now.** Pennsylvania (PA) is the only supported jurisdiction — extraction prompts, timeline templates, contract-number prefixes, and demo content all target the PAR Form ASR (Standard Agreement for the Sale of Real Estate).

Concretely, this means:
- Default state when extraction is silent → `'PA'` (`normalizeStateCode()` in `app/api/documents/[id]/create-transaction/route.ts`)
- Active timeline template → `pa_residential` (`lib/services/timeline-service.ts`)
- Contract number prefix → `PAAOS-`
- Default city / county / postal fallbacks → `Lansdale` / `Montgomery` / `19446`

A `ny_residential` template and a `NYRCS-` branch still exist in code as **legacy scaffolding** from the prior NY-first version. They are not part of the current product and should not be relied on or maintained. Don't extend them; if you touch them, ask first.

DB-level: the `state` column on `people` and `properties` accepts any 2-letter USPS code (`^[A-Z]{2}$` check), so the schema doesn't block multi-state work — but there's no product use case for non-PA values today.

### Audit trail

Every API route that creates, updates, or deletes data must call `createAuditEvent()` from `lib/services/audit-service.ts`. The `audit_events` table is append-only.

---

## Design system

### Colors (CSS custom properties in globals.css)

```css
:root {
  --color-surface:        #F8F7F4;   /* warm off-white background */
  --color-surface-raised: #FFFFFF;   /* cards */
  --color-surface-sunken: #EFEDE8;   /* inset areas */
  --color-navy:           #1B2A4A;   /* primary brand */
  --color-navy-light:     #2D4270;   /* hover state */
  --color-gold:           #C9973A;   /* accent, AI highlights, CTA */
  --color-gold-light:     #F0DDB0;   /* gold tinted surface */
  --color-text-primary:   #1A1A1A;
  --color-text-secondary: #666058;
  --color-text-disabled:  #ABABAB;
  --color-error:          #C0392B;   /* high risk / denied */
  --color-warning:        #D4870A;   /* medium risk / approval required */
  --color-success:        #2E7D32;   /* low risk / allowed */
  --color-info:           #1565C0;
  --color-border:         #DEDAD2;
  --color-border-focus:   #C9973A;
}
```

### Policy decision colors

Consistent across all agent UI components:
- `allowed` → `--color-success` (green)
- `denied` → `--color-error` (red)
- `approval_required` → `--color-warning` (amber)

### Typography

- **Headlines:** Playfair Display (`font-display`)
- **Body/UI:** DM Sans (`font-sans`)
- **Data/monospace:** JetBrains Mono (`font-mono`) — use for receipt IDs, timestamps, skill names

### Component classes

Pre-built: `.card`, `.field-label`, `.field-input`, `.btn-primary`, `.btn-secondary`, `.btn-gold`, `.badge`, `.badge-error`, `.badge-warning`, `.badge-success`, `.badge-info`, `.mono-value`

### Animations

- `.stagger-in` — staggered fade-in using `--i` CSS custom property
- `.slide-in-right` — panel slide-in (use for agent panel)
- `.fade-in-scale` — modal/card entrance (use for ApprovalModal)

---

## Coding standards

### TypeScript

- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Components are function components only
- Event handlers named `handleX`, not `onX`
- Path alias: `@/*` maps to `./src/*`

### API routes

All complex operations go through Next.js API routes in `src/app/api/`. The agent chat route (`/api/agent/chat`) is the orchestration hub for all agent actions.

### Git

```
feat: add agent chat route with policy gate
feat: add red-team attack console
fix: deny escrow modification at hard-deny layer
chore: run agent_receipts migration
```

---

## Environment

```bash
# .env.local — required variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
LLAMA_CLOUD_API_KEY=llx-xxxxxxxxxxxxxxxxxx
CRON_SECRET=random-hex-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STORAGE_BUCKET=documents

# Optional — public marketing / waitlist only (no dashboard, login, or other APIs)
WAITLIST_ONLY=true
```

When `WAITLIST_ONLY` is `true` or `1`, **middleware** only allows `/`, static assets, and `POST /api/waitlist`. Run **Migration 004** in `migrations.md` (`waitlist_signups` table) before collecting emails. Unset the variable (or set to `false`) when the full app should be reachable again.

---

## Running the app

```bash
npm install
npm run dev             # http://localhost:3000
npm test                # Vitest single run
npm run test:watch      # Vitest watch mode
npm run types:supabase  # Regenerate DB types after schema changes
```

---

## Security

- `next.config.js` sets security headers (X-Frame-Options: DENY, CSP, etc.)
- PII masking via `MaskedField` component + `/api/security/pii-reveal` endpoint
- Wire fraud banner on escrow sections
- Idle timeout guard
- Rate limiting on API routes (including a dedicated **waitlist** bucket for `POST /api/waitlist`)
- **Waitlist mode** — optional `WAITLIST_ONLY` env gates the entire product to landing + waitlist signup only
- Contract lockdown prevents edits to closed/cancelled deals
- **Agent policy gate** — all agent actions evaluated against manifest before execution
- **Agent receipts** — every agent action logged to `agent_receipts` regardless of decision
- **Hard deny rules** — prompt injection patterns, escrow modifications, cross-org queries always blocked at policy layer

---

## Demo critical paths

**Existing path — must never break:**
```
Upload PDF → Extraction review → Create Transaction → Transaction detail (timeline + health + tasks)
```

**Guard demo path:**
```
Transaction detail → Agent page → Role selector → Ask question → See policy decision + receipt
                                                              → Run attack console → See scoreboard
```

If any link in either path is broken, stop and fix it before anything else.

---

## Working rules — read before editing anything

These two rules govern every change in this repo. They override speed, ambition, or "I think this should work."

### Rule 1 — The 95% rule

Only move forward on a change when you are roughly 95% sure it is correct for *this* repo and will not regress something already working. Below that bar, the move is to gather more context — read the callers, trace the data, run a small repro, check the actual schema, look at what tests exist — until you cross the bar, or stop and propose a safer approach. Guessing is not a strategy. When the requirement is ambiguous, prefer additive changes (new column, new function, new component) over risky refactors that touch existing behavior.

### Rule 2 — Plan, execute, test, repeat

Work proceeds one verified step at a time, never in a giant batch:

1. **Plan** — write down what you're about to do and why, in plain language. Get alignment if the change is non-trivial.
2. **Execute** — make the change. Keep it scoped to that step. Don't bundle in unrelated cleanups.
3. **Test** — actually run it. `npx tsc --noEmit` for types, `npm test -- --run` for unit tests, the dev server + a real action in the browser for UI changes. If it doesn't pass, the step isn't done.
4. **Then plan the next step.**

Skipping the test phase to "save time" is the fastest way to break the demo critical paths. A green test step earns the right to start the next plan.

---

## Change confidence and shipping discipline

The two rules above are the law. The notes here are reminders.

- After you implement something, **exercise it locally** before you treat the work as done. UI changes need a browser check, not just a passing type compile.
- Only **commit** or **deploy** once verification passes — or document the intentional exception.
- Shipping untested edits is the failure mode this repo cares about most.