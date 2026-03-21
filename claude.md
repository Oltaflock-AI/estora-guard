# CLAUDE.md — Estora / transaction-control

This file is the persistent context for every Claude Code session on this repo.
Read it fully before touching any file. It contains the product context, architecture,
coding standards, current state of the codebase, and known gaps to address.

-----

## What this product is

Estora is a real estate transaction intelligence platform. The core loop:

1. Agent uploads a contract PDF
1. Claude reads it and extracts structured fields (buyer, seller, dates, contingencies)
1. Claude flags risks (short inspection windows, missing clauses, ambiguous language)
1. A transaction is auto-created with a full milestone timeline and task list
1. A Celery beat worker monitors every deal every 15 minutes and recalculates health scores
1. Every action is logged to an append-only audit trail

The demo is the story. Every technical decision serves a 90-second presentation moment.
Build accordingly — reliability and visual coherence matter more than completeness.

-----

## Repo structure

```
estora/
├── apps/
│   ├── api/               FastAPI backend (Python 3.12, uv)
│   │   └── src/tc/
│   │       ├── api/v1/    HTTP endpoints
│   │       ├── core/      Config, security, logging, timeline_templates.json
│   │       ├── db/        SQLAlchemy models + Alembic migrations
│   │       ├── domain/    Enums, domain models, rules engine
│   │       ├── services/  Business logic (stateless, injected via FastAPI Depends)
│   │       ├── tests/     pytest suite
│   │       └── workers/   Celery app, beat schedule, task definitions
│   └── web/               Next.js 14 frontend (TypeScript, Tailwind)
│       └── src/
│           ├── app/       Next.js App Router pages
│           ├── components/ React components (DOES NOT EXIST YET — must be created)
│           └── lib/       api.ts, auth.ts, types.ts
├── docs/                  ADRs + architecture notes
├── infra/                 Dockerfiles + docker-compose.yml
├── scripts/               dev.sh, fmt.sh, seed_db.py
└── .env.example
```

-----

## Current branch: slopathon

This is the hackathon branch. It contains a solid backend foundation but is missing
two critical layers that must be built before any demo is possible:

### What exists and works

- Full transaction CRUD (`api/v1/transactions.py`)
- Health scoring service (`services/health_service.py`)
- Timeline generation service (`services/timeline_service.py`)
- Deadline monitoring (`services/deadline_service.py`)
- Rules engine (`domain/rules.py`)
- Celery worker + beat schedule (`workers/`)
- Audit trail model and service (`db/models/audit.py`, `services/audit_service.py`)
- Auth with dev token (`api/v1/auth.py`, `services/auth_service.py`)
- Test suite with good coverage of core logic

### What does NOT exist and must be built

#### Backend — document intelligence layer

- `db/models/documents.py` — Document, Extraction, RiskFlag SQLAlchemy models
- `db/migrations/versions/xxxx_add_document_intelligence.py` — migration for new tables
- `services/document_intelligence.py` — pypdf extraction + Claude API call
- `api/v1/documents.py` — upload, extraction review, create-transaction endpoints
- Must be wired into `api/v1/router.py`

#### Frontend — all pages and components

The web app currently has only `layout.tsx` and `page.tsx`.
Everything else must be created:

- `app/dashboard/page.tsx` — upload dropzone + deal list
- `app/dashboard/documents/[id]/page.tsx` — extraction review
- `app/dashboard/transactions/[id]/page.tsx` — transaction nerve center
- `components/DocumentDropzone.tsx`
- `components/ExtractionViewer.tsx`
- `components/RiskFlagPanel.tsx`
- `components/TimelineView.tsx`
- `components/HealthBar.tsx`
- `components/TaskList.tsx`

-----

## Architecture rules

### Backend

**Service layer is stateless.** Services receive a `db: Session` and the input data.
No service instantiates its own DB session. All sessions are injected via FastAPI `Depends`.

```python
# CORRECT
def get_health(transaction_id: UUID, db: Session) -> HealthResult:
    ...

# WRONG
class HealthService:
    def __init__(self):
        self.db = SessionLocal()
```

**Domain models are not DB models.** `domain/models.py` contains Pydantic models
for request/response shapes. `db/models/` contains SQLAlchemy ORM models. Never mix them.

**Rules engine is in `domain/rules.py`.** Risk flag logic lives there, not in services
or endpoints. When adding a new risk flag type, add a rule to `domain/rules.py` first,
then reference it from `document_intelligence.py`.

**Celery tasks are thin.** Worker tasks in `workers/tasks.py` should call service
functions, not contain business logic. Keep tasks under 20 lines.

**Audit every mutation.** Any endpoint that creates, updates, or deletes data must
call `audit_service.log(...)` before returning. The audit trail is append-only.
Never add UPDATE or DELETE on `audit_log` rows.

**Migrations are irreversible in production.** Always write a `downgrade()` function
in Alembic migrations, but treat the upgrade path as the source of truth.
Never modify a committed migration file — add a new one.

### Frontend

**All fetch calls go through `lib/api.ts`.** No `fetch()` in components.
Every API function is typed with the interfaces from `lib/types.ts`.

**Design system — non-negotiable:**

```css
:root {
  --bg:         #0C0C0B;   /* near-black warm */
  --surface:    #141413;   /* cards */
  --border:     #2A2A28;   /* subtle borders */
  --text:       #E8E6DF;   /* warm white */
  --muted:      #7A7870;   /* secondary text */
  --amber:      #D4880A;   /* AI highlights, CTA */
  --amber-bg:   #1C1609;   /* amber tinted surface */
  --red:        #C0392B;   /* high risk */
  --yellow:     #B8860B;   /* medium risk */
  --green:      #1A6B4A;   /* low risk / done */
  --green-text: #4CAF7D;
}
```

**Typography:**

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- Headlines: `DM Serif Display`
- Body/UI: `DM Sans`
- Data/monospace (addresses, dates, IDs): `DM Mono`

**No rounded hero blobs. No gradient meshes. No purple.**
Sharp horizontal rules, monospace data, generous whitespace.

**Stagger animations require inline CSS custom property:**

```tsx
// CORRECT — each row animates offset from the previous
<div style={{ '--i': index } as React.CSSProperties} className="extraction-row" />

// WRONG — all rows animate simultaneously
<div className="extraction-row" />
```

**HealthBar is a vertical mercury bar, not a donut chart.**
6px wide, 120px tall, filled from bottom, color transitions green→amber→red by score.

-----

## Coding standards

### Python

- Formatter: `ruff` + `black` — run `scripts/fmt.sh` before committing
- Type hints on all function signatures
- No bare `except:` — catch specific exceptions
- `UUID` type for all ID fields, never raw `str`
- Use `from __future__ import annotations` in all model files

### TypeScript

- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Components are function components only, no class components
- Event handlers named `handleX`, not `onX` (reserve `on` for props)

### Git

```
feat: add document intelligence service
fix: handle null close_date in timeline generation
chore: remove .DS_Store from tracking
```

Branch from `slopathon`. PR back to `slopathon`.

-----

## Environment

```bash
# .env — required variables
DATABASE_URL=postgresql://estora:estora@postgres:5432/estora
REDIS_URL=redis://redis:6379/0
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
JWT_SECRET=change-this-to-a-random-256-bit-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ENVIRONMENT=development
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`ENVIRONMENT=production` disables `POST /auth/dev-token`.
Never deploy with `ENVIRONMENT=development` on a public server.

-----

## Running the stack

```bash
# Full stack
docker compose -f infra/docker-compose.yml up -d

# Apply migrations
docker compose -f infra/docker-compose.yml exec -w /app/apps/api api uv run alembic upgrade head

# Backend only (local)
cd apps/api && uv sync && uv run uvicorn src.tc.main:app --reload --port 8000

# Frontend only (local)
cd apps/web && npm install && npm run dev

# Celery worker (local)
cd apps/api && uv run celery -A src.tc.workers.celery_app worker --beat --loglevel=info
```

-----

## Adding a Python dependency

```bash
docker compose -f infra/docker-compose.yml exec -w /app/apps/api api uv add <package>
docker compose -f infra/docker-compose.yml up --build -d
```

-----

## Known issues to fix in this session

These must be addressed. See TASKS.md for the full ordered build plan.

1. `.DS_Store` is tracked in git root — remove it
1. `workers/tasks.py` and `api/v1/tasks.py` share a name — rename worker file to `celery_tasks.py`
1. `document_intelligence.py` service does not exist — build it
1. `db/models/documents.py`, `extractions`, `risk_flags` do not exist — create models + migration
1. `api/v1/documents.py` does not exist — create endpoint and wire to router
1. All frontend pages and components are missing — build them
1. `audit.py` and `event_log.py` model distinction is undocumented — add docstrings clarifying the split
1. `seed_db.py` should populate demo-ready data — verify and update if needed

-----

## Demo critical path

The minimum viable demo loop is:

```
Upload PDF → Extraction review (risk flags visible) → Create Transaction → Transaction detail (timeline + health score)
```

If any link in this chain is broken, the demo fails. Protect this path above all else.
When in doubt about what to build next, ask: does this unblock the demo loop?

-----

## Claude API usage

```python
# Always use this model string
model = "claude-sonnet-4-20250514"

# API key is read from environment — never hardcode
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

# Max tokens for extraction
max_tokens = 2000
```

The Anthropic client is used only in `services/document_intelligence.py`.
No other service or endpoint should call the Anthropic API directly.

-----

## Test patterns

```python
# Mock Claude in all tests — never call the live API
@pytest.fixture
def mock_anthropic(monkeypatch):
    def fake_create(**kwargs):
        return SimpleNamespace(
            content=[SimpleNamespace(text=FIXTURE_EXTRACTION_JSON)]
        )
    monkeypatch.setattr(
        "tc.services.document_intelligence.anthropic.Anthropic",
        lambda: SimpleNamespace(
            messages=SimpleNamespace(create=fake_create)
        )
    )
```

Fixture JSON lives in `tests/fixtures/extraction_response.json`.
Create this file when building the document intelligence tests.

-----

## File naming reference

|What                 |Where                                       |
|---------------------|--------------------------------------------|
|New SQLAlchemy model |`apps/api/src/tc/db/models/<name>.py`       |
|New Alembic migration|`apps/api/src/tc/db/migrations/versions/`   |
|New service          |`apps/api/src/tc/services/<name>_service.py`|
|New API endpoint file|`apps/api/src/tc/api/v1/<name>.py`          |
|New domain rule      |`apps/api/src/tc/domain/rules.py`           |
|New Next.js page     |`apps/web/src/app/<path>/page.tsx`          |
|New React component  |`apps/web/src/components/<Name>.tsx`        |
|New API type         |`apps/web/src/lib/types.ts`                 |
|New fetch wrapper    |`apps/web/src/lib/api.ts`                   |
