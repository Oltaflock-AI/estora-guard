# CLAUDE.md — Estora AI

This file is the persistent context for every Claude Code session on this repo.
Read it fully before touching any file.

-----

## What this product is

Estora is a real estate transaction intelligence platform. The core loop:

1. Agent uploads a contract PDF
2. Claude reads it and extracts structured fields (buyer, seller, dates, contingencies)
3. Claude flags risks (short inspection windows, missing clauses, ambiguous language)
4. A transaction is auto-created with full party records, property, mortgage, escrow, timeline, and health score
5. The agent manages the deal through task completion, timeline tracking, and agreement editing
6. Every action is logged to an append-only audit trail

-----

## Architecture

This is a **self-contained Next.js 14 application** using **Supabase** as the backend. There is no separate API server.

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** Supabase PostgreSQL with Row-Level Security
- **Auth:** Supabase Auth (email/password)
- **Storage:** Supabase Storage (PDF uploads)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Testing:** Vitest + React Testing Library

> **The `transaction-control/` folder is legacy.** It contains a Python/FastAPI backend that was the original plan but is completely unused. The frontend has zero imports or API calls to it. Ignore it.

-----

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
│   │   ├── agreements/[id]/page.tsx                # Agreement editing workspace
│   │   └── audit/page.tsx                          # Full audit trail
│   └── api/
│       ├── documents/upload/route.ts               # PDF upload + Claude extraction
│       ├── documents/[id]/create-transaction/route.ts
│       ├── agreements/[id]/save/route.ts           # Atomic agreement updates
│       ├── contracts/[id]/route.ts                 # Delete contract + cascade
│       ├── transactions/[id]/tasks/[taskId]/status/route.ts
│       ├── risk-flags/[id]/acknowledge/route.ts
│       └── security/pii-reveal/route.ts
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
    ├── agreement-schema.ts                         # Form field definitions
    ├── contract-lockdown.ts                        # Edit permission rules by status
    ├── rate-limit.ts
    ├── supabase/
    │   ├── client.ts                               # Browser client
    │   ├── server.ts                               # Server client + service role client
    │   └── database.types.ts                       # Auto-generated (npm run types:supabase)
    └── services/
        ├── document-intelligence.ts                # Claude API for PDF extraction
        ├── health-service.ts                       # Health score calculation
        ├── timeline-service.ts                     # Default timeline generation
        ├── deadline-service.ts                     # Deadline monitoring
        ├── audit-service.ts                        # Append-only audit logging
        └── rules-engine.ts                         # Risk flag rule definitions
```

-----

## Database schema (Supabase)

Core tables:

| Table                       | Purpose                                            |
|-----------------------------|----------------------------------------------------|
| `contracts`                 | Core deal record (dates, price, status, health)    |
| `documents`                 | Uploaded PDFs with processing status               |
| `extractions`               | AI-extracted fields with confidence + page refs    |
| `risk_flags`                | Detected risks (severity, acknowledged status)     |
| `tasks`                     | Deal checklist items (todo/in_progress/done/overdue) |
| `timeline_items`            | Milestone events on the deal timeline              |
| `properties`                | Property address and details                       |
| `people`                    | Parties (seller, purchaser, attorneys)             |
| `contract_mortgages`        | Mortgage details linked to contracts               |
| `contract_escrow`           | Escrow details linked to contracts                 |
| `contract_personal_property`| Personal property included in sale                 |
| `contract_permitted_exceptions` | Title exceptions                               |
| `contract_violations`       | Known property violations                          |
| `contract_closing_conditions`| Closing conditions                                |
| `contract_apportionments`   | Tax/utility apportionments                         |
| `audit_events`              | Append-only mutation log                           |
| `event_logs`                | System event logging                               |
| `profiles`                  | User profiles                                      |
| `organizations`             | Multi-tenant orgs                                  |
| `memberships`               | Org membership + roles                             |

Types are auto-generated into `src/lib/supabase/database.types.ts`. Regenerate with:
```bash
npm run types:supabase
```

-----

## Architecture rules

### Data access

**All database operations go through Supabase clients.** Two clients exist:

- `createClient()` in `lib/supabase/server.ts` — uses the anon key, respects RLS, tied to the user's session cookies
- `createServiceClient()` in `lib/supabase/server.ts` — uses the service role key, bypasses RLS, used in API routes that need cross-org access

Never instantiate Supabase clients outside of these two functions.

### Services

Services in `lib/services/` are stateless functions. They receive a typed Supabase client and input data. No service creates its own client.

```typescript
// CORRECT
export async function computeHealthScore(
  supabase: TypedClient,
  contractId: string
): Promise<HealthResult> { ... }

// WRONG
export async function computeHealthScore(contractId: string) {
  const supabase = createClient(); // Don't do this
}
```

### Types

All types are derived from the auto-generated `database.types.ts`. The `lib/types.ts` file re-exports row types with friendly aliases:

```typescript
export type Contract = Tables['contracts']['Row'];
export type Person = Tables['people']['Row'];
```

Composite types like `ContractDetail` and `DocumentWithExtractions` are defined in `lib/types.ts` as interfaces extending the base row types.

### Claude API usage

The Anthropic client is used **only** in `lib/services/document-intelligence.ts`. No other file should import or call the Anthropic API.

```typescript
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4_000;
```

The API key is read from `ANTHROPIC_API_KEY` env var. Never hardcode it.

### Audit trail

Every API route that creates, updates, or deletes data must call `createAuditEvent()` from `lib/services/audit-service.ts`. The `audit_events` table is append-only. Never update or delete audit rows.

### Contract lockdown

`lib/contract-lockdown.ts` defines which contract statuses allow editing. Closed and cancelled contracts are read-only. Check lockdown rules before allowing mutations.

-----

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
  --color-error:          #C0392B;   /* high risk */
  --color-warning:        #D4870A;   /* medium risk */
  --color-success:        #2E7D32;   /* low risk / done */
  --color-info:           #1565C0;
  --color-border:         #DEDAD2;
  --color-border-focus:   #C9973A;   /* gold focus ring */
}
```

### Typography (loaded via next/font/google in layout.tsx)

- **Headlines:** Playfair Display (`font-display`)
- **Body/UI:** DM Sans (`font-sans`)
- **Data/monospace:** JetBrains Mono (`font-mono`)

### Component classes (globals.css @layer components)

Pre-built utility classes: `.card`, `.field-label`, `.field-input`, `.field-input-readonly`, `.btn-primary`, `.btn-secondary`, `.btn-gold`, `.badge`, `.badge-error`, `.badge-warning`, `.badge-success`, `.badge-info`, `.mono-value`

### Animations (globals.css @layer utilities)

- `.stagger-in` — staggered fade-in using `--i` CSS custom property
- `.card-enter` — staggered card entrance
- `.health-bar-fill` — mercury bar transition
- `.pulse-overdue` — overdue task pulse
- `.slide-in-right` — panel slide-in
- `.fade-in-scale` — modal/card entrance
- `.timeline-dot-current` — current milestone pulse
- `.save-pulse` — auto-save indicator
- `.completion-ring` — section completion ring

**Stagger animations require inline CSS custom property:**
```tsx
<div style={{ '--i': index } as React.CSSProperties} className="stagger-in" />
```

### Design principles

- Light warm theme (off-white, navy, gold)
- Sharp horizontal rules, monospace data, generous whitespace
- No rounded hero blobs, no gradient meshes, no purple
- HealthBar is a vertical mercury bar (6px wide, 120px tall, bottom-filled)

-----

## Coding standards

### TypeScript

- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Components are function components only, no class components
- Event handlers named `handleX`, not `onX` (reserve `on` for props)
- Path alias: `@/*` maps to `./src/*`

### API routes

All complex operations (upload, create-transaction, save) go through Next.js API routes in `src/app/api/`. These are the "glue layer" that orchestrates Supabase operations, calls services, and logs audit events.

### Git

```
feat: add document intelligence service
fix: handle null close_date in timeline generation
chore: remove .DS_Store from tracking
```

-----

## Environment

```bash
# .env.local — required variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
CRON_SECRET=random-hex-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STORAGE_BUCKET=documents
```

-----

## Running the app

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Vitest single run
npm run test:watch   # Vitest watch mode
npm run types:supabase  # Regenerate DB types
```

-----

## Security

- `next.config.js` sets security headers (X-Frame-Options: DENY, CSP, etc.)
- `serverActions.bodySizeLimit` is 25mb (for PDF uploads)
- `poweredByHeader` is disabled
- PII masking via `MaskedField` component + `/api/security/pii-reveal` endpoint
- Wire fraud banner on escrow sections
- Idle timeout guard for session management
- Rate limiting on API routes
- Contract lockdown prevents edits to closed/cancelled deals

-----

## Demo critical path

```
Upload PDF -> Extraction review (risk flags visible) -> Create Transaction -> Transaction detail (timeline + health + tasks)
```

If any link in this chain is broken, the demo fails. Protect this path above all else.
