# Estora AI

Real estate transaction intelligence platform. Upload a contract PDF, let Claude extract structured fields and flag risks, then manage the deal through a full milestone timeline with health scoring and audit trail.

---

## Architecture Overview

Estora is a **self-contained Next.js 14 application** using **Supabase** as the backend (database, auth, storage). All business logic runs inside Next.js API routes and service modules — there is no separate backend server.

> **Note:** The `transaction-control/` folder contains a Python/FastAPI backend that was scaffolded early on but is **not used** by the application. The entire platform was rebuilt as a Next.js + Supabase monolith. That folder can be ignored or removed.

### Tech Stack

| Layer        | Technology                          |
|-------------|-------------------------------------|
| Framework   | Next.js 14 (App Router)            |
| Language    | TypeScript (strict mode)            |
| Database    | Supabase (PostgreSQL + Row-Level Security) |
| Auth        | Supabase Auth (email/password)      |
| Storage     | Supabase Storage (PDF uploads)      |
| AI          | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Styling     | Tailwind CSS                        |
| Icons       | Lucide React                        |
| Date utils  | date-fns                            |
| Testing     | Vitest + React Testing Library      |

---

## Core Demo Loop

```
Upload PDF  -->  AI Extraction + Risk Flags  -->  Create Transaction  -->  Timeline + Health Score
```

1. **Upload PDF** — Agent drops a real estate contract into the dashboard
2. **AI Extraction** — Claude reads the PDF and extracts structured fields (buyer, seller, dates, price, contingencies) with confidence scores and page references
3. **Risk Detection** — Rules engine flags risks (short inspection windows, missing clauses, ambiguous language)
4. **Transaction Creation** — One click creates the full deal: contract record, parties, property, mortgage, escrow, timeline, and health score
5. **Deal Management** — Transaction detail page shows timeline, tasks, health bar, and risk flags. Tasks can be checked off, health recalculates automatically
6. **Agreement Editing** — Inline editing workspace with real-time validation and auto-save
7. **Audit Trail** — Every mutation is logged to an append-only audit table

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                              # Landing page
│   ├── layout.tsx                            # Root layout (fonts, theme)
│   ├── globals.css                           # Design tokens + Tailwind
│   ├── (auth)/
│   │   ├── login/page.tsx                    # Login
│   │   ├── signup/page.tsx                   # Registration
│   │   └── forgot-password/page.tsx          # Password recovery
│   ├── dashboard/
│   │   ├── page.tsx                          # Upload dropzone + deal list
│   │   ├── documents/[id]/page.tsx           # Extraction review
│   │   ├── transactions/[id]/page.tsx        # Transaction nerve center
│   │   ├── transactions/[id]/TransactionDetail.tsx
│   │   ├── agreements/[id]/page.tsx          # Agreement editing workspace
│   │   └── audit/page.tsx                    # Full audit trail
│   └── api/
│       ├── documents/
│       │   ├── upload/route.ts               # PDF upload + Claude extraction
│       │   └── [id]/create-transaction/route.ts  # Extraction -> full deal
│       ├── agreements/[id]/save/route.ts     # Atomic agreement updates
│       ├── contracts/[id]/route.ts           # Delete contract + cascade
│       ├── transactions/[id]/tasks/[taskId]/status/route.ts  # Task toggle
│       ├── risk-flags/[id]/acknowledge/route.ts  # Acknowledge risk
│       └── security/pii-reveal/route.ts      # PII unmasking
├── components/
│   ├── DocumentDropzone.tsx                  # PDF drag-and-drop upload
│   ├── DealList.tsx                          # Contract cards grid
│   ├── ExtractionViewer.tsx                  # Extracted fields display
│   ├── RiskFlagPanel.tsx                     # Risk flag cards
│   ├── TimelineView.tsx                      # Milestone timeline
│   ├── TaskList.tsx                          # Checklist with status toggle
│   ├── HealthBar.tsx                         # Vertical mercury bar (green->amber->red)
│   ├── EditCanvas.tsx                        # Agreement editing form
│   ├── ValidationPanel.tsx                   # Field validation results
│   ├── SectionNavigator.tsx                  # Agreement section nav
│   ├── AuditTrail.tsx                        # Audit event list
│   ├── DashboardShell.tsx                    # Dashboard layout wrapper
│   ├── RealtimeRefresh.tsx                   # Supabase realtime subscription
│   ├── ErrorBoundary.tsx                     # Error handling wrapper
│   ├── OfflineBanner.tsx                     # Offline detection
│   ├── MobileReadOnlyGuard.tsx               # Mobile access gate
│   ├── security/
│   │   ├── WireFraudBanner.tsx               # Wire fraud warning on escrow
│   │   ├── ClosingProximityFlag.tsx          # Closing date < 7 days warning
│   │   ├── IdleTimeoutGuard.tsx              # Session timeout
│   │   ├── MaskedField.tsx                   # PII masking with reveal
│   │   └── PasswordStrength.tsx              # Password strength meter
│   └── ui/
│       ├── Badge.tsx                         # Status badge
│       └── Skeleton.tsx                      # Loading skeleton
└── lib/
    ├── types.ts                              # Shared TypeScript interfaces
    ├── utils.ts                              # Formatting helpers
    ├── auth-helpers.ts                       # Auth utilities
    ├── agreement-schema.ts                   # Form field definitions
    ├── contract-lockdown.ts                  # Edit permission rules
    ├── rate-limit.ts                         # API rate limiting
    ├── supabase/
    │   ├── client.ts                         # Browser Supabase client
    │   ├── server.ts                         # Server Supabase client + service role
    │   └── database.types.ts                 # Auto-generated DB types
    └── services/
        ├── document-intelligence.ts          # Claude API extraction + risk detection
        ├── health-service.ts                 # Health score calculation
        ├── timeline-service.ts               # Default timeline generation
        ├── deadline-service.ts               # Deadline monitoring
        ├── audit-service.ts                  # Audit trail logging
        └── rules-engine.ts                   # Risk flag rule definitions
```

---

## Database Schema (Supabase)

| Table                 | Purpose                                        |
|-----------------------|------------------------------------------------|
| `contracts`           | Core deal record (dates, price, status, health_score) |
| `documents`           | Uploaded PDFs with processing status           |
| `extractions`         | AI-extracted fields with confidence + page refs |
| `risk_flags`          | Detected risks (severity, acknowledged status) |
| `tasks`               | Deal checklist items (todo/in_progress/done)   |
| `timeline_items`      | Milestone events on the deal timeline          |
| `properties`          | Property address and details                   |
| `people`              | Parties (buyer, seller, attorneys)             |
| `contract_mortgages`  | Mortgage details linked to contracts           |
| `contract_escrow`     | Escrow details linked to contracts             |
| `audit_events`        | Append-only mutation log                       |
| `event_logs`          | System event logging                           |

---

## Data Flow

```
User uploads PDF
  |
  v
POST /api/documents/upload
  ├── Validate PDF (magic bytes check)
  ├── Store file in Supabase Storage
  ├── Call Anthropic Claude API (document-intelligence.ts)
  │   └── Returns: extracted fields, confidence scores, page refs, risk flags
  ├── Insert document record (status: processing -> done)
  ├── Insert extraction rows
  ├── Insert risk_flag rows
  └── Log audit event
  |
  v
User reviews at /dashboard/documents/[id]
  ├── ExtractionViewer shows all extracted fields
  ├── RiskFlagPanel shows detected risks
  └── AI summary displayed
  |
  v
POST /api/documents/[id]/create-transaction
  ├── Parse extractions into structured data
  ├── Create or resolve people records (seller, buyer, attorneys)
  ├── Create or resolve property record
  ├── Create contract with all financial fields
  ├── Create mortgage record (if applicable)
  ├── Create escrow record (if applicable)
  ├── Generate default timeline from contract dates
  ├── Compute initial health score
  └── Log audit event
  |
  v
User manages at /dashboard/transactions/[id]
  ├── TimelineView shows milestones
  ├── TaskList with status toggles (recalculates health on change)
  ├── HealthBar shows deal health (green/amber/red)
  └── RiskFlagPanel shows flags from source document
```

---

## Services

### Document Intelligence (`services/document-intelligence.ts`)
Sends the PDF content to Claude (`claude-sonnet-4-20250514`) with a structured prompt. Claude returns extracted fields (buyer name, seller name, purchase price, closing date, contingencies, etc.) along with confidence scores and page references. Also returns detected risk flags with severity levels and explanations.

### Health Service (`services/health-service.ts`)
Computes a 0-100 health score for each contract based on:
- Task completion percentage
- Proximity to closing date
- Number of unresolved risk flags
- Missing required fields
- Overdue milestones

Score maps to color: green (70-100), amber (40-69), red (0-39).

### Timeline Service (`services/timeline-service.ts`)
Generates a default milestone timeline from contract dates (signing, inspection deadline, appraisal, mortgage commitment, closing). Each milestone gets a target date derived from the contract's key dates and standard real estate timelines.

### Rules Engine (`services/rules-engine.ts`)
Defines risk detection rules that flag issues like:
- Inspection window shorter than 10 days
- Missing attorney review clause
- Closing date less than 30 days from signing
- Ambiguous contingency language
- Missing escrow details

### Audit Service (`services/audit-service.ts`)
Logs every mutation (create, update, delete) to the `audit_events` table with:
- Actor (user ID)
- Action type
- Entity type and ID
- Field-level diffs (old value -> new value)
- Timestamp

### Deadline Service (`services/deadline-service.ts`)
Monitors upcoming deadlines across all active contracts and surfaces those approaching within configurable thresholds.

---

## Design System

| Token        | Value       | Usage                          |
|-------------|-------------|--------------------------------|
| `--bg`      | `#0C0C0B`   | Near-black warm background     |
| `--surface` | `#141413`   | Card surfaces                  |
| `--border`  | `#2A2A28`   | Subtle borders                 |
| `--text`    | `#E8E6DF`   | Primary text (warm white)      |
| `--muted`   | `#7A7870`   | Secondary text                 |
| `--amber`   | `#D4880A`   | AI highlights, CTAs            |
| `--red`     | `#C0392B`   | High risk                      |
| `--yellow`  | `#B8860B`   | Medium risk                    |
| `--green`   | `#1A6B4A`   | Low risk / completed           |

**Typography:** DM Serif Display (headlines), DM Sans (body/UI), DM Mono (data/dates/IDs)

**Principles:** Sharp horizontal rules, monospace data, generous whitespace. No rounded hero blobs, no gradient meshes, no purple.

---

## Security Features

- **Authentication** — Supabase Auth with email/password, session management
- **Row-Level Security** — Supabase RLS policies filter data by organization
- **PII Masking** — Sensitive fields (SSN, account numbers) masked by default with reveal-on-demand
- **Wire Fraud Warning** — Banner displayed on escrow-related sections
- **Closing Proximity Alert** — Warning when closing date is less than 7 days away
- **Idle Timeout** — Auto-logout after inactivity
- **Contract Lockdown** — Closed/cancelled contracts cannot be edited
- **Audit Trail** — Every create, update, and delete is logged with actor, timestamp, and field-level diffs
- **Rate Limiting** — API routes are rate-limited

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the schema applied
- An Anthropic API key

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
```

### Install and Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Generate Database Types

```bash
npm run types:supabase
```

### Run Tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

---

## About the `transaction-control/` Folder

The `transaction-control/` directory contains a Python/FastAPI backend that was the original architectural plan. It includes:

- FastAPI endpoints for transaction CRUD
- SQLAlchemy models + Alembic migrations
- Celery worker with beat scheduling for health score monitoring
- A rules engine and service layer

**None of this code is used by the running application.** During development, the entire backend was rebuilt inside Next.js API routes with Supabase as the database, making the Python backend redundant. The frontend has zero imports or API calls to the FastAPI service.

This folder can be safely removed or kept as reference material.
