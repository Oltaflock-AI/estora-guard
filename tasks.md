# TASKS.md — Estora Build Prompt for Claude Code CLI

This file is the execution plan for the slopathon branch.
Feed it to Claude Code CLI: `claude < TASKS.md` or paste into a Claude Code session.

Read CLAUDE.md first. Every decision in this file assumes that context.

Work through tasks in order. Do not skip ahead. Each task unblocks the next.
After completing each task, run the verification command before moving on.

-----

## TASK 1 — Housekeeping

### 1a. Remove .DS_Store from git tracking

```
Remove .DS_Store from git tracking. The file is at the repo root.
Run: git rm --cached .DS_Store
Add .DS_Store to .gitignore if it isn't already there.
Commit with message: chore: remove .DS_Store from git tracking
```

### 1b. Rename workers/tasks.py to avoid naming conflict

```
Rename apps/api/src/tc/workers/tasks.py to apps/api/src/tc/workers/celery_tasks.py

Update every import of this module across the codebase:
- workers/__init__.py (if it imports from tasks)
- workers/beat_schedule.py (likely imports task functions)
- workers/celery_app.py (likely registers tasks)
- Any test files in tests/ that import from workers.tasks

After renaming, verify the Celery app still discovers the tasks correctly
by checking that all @celery_app.task decorated functions are still registered.

Commit with message: refactor: rename workers/tasks.py to celery_tasks.py to avoid naming conflict with api/v1/tasks.py
```

### 1c. Add clarifying docstrings to audit.py and event_log.py models

```
Open apps/api/src/tc/db/models/audit.py and add a module-level docstring that explains:
- This table is the user-action audit trail
- It is append-only — no UPDATE or DELETE operations are permitted
- Every mutation endpoint must write to this table before returning
- The table is exposed via GET /api/v1/audit/transactions/{id}

Open apps/api/src/tc/db/models/event_log.py and add a module-level docstring that explains:
- This table is the Celery worker event feed
- It records system-generated events (deadline scans, health recalculations, timeline generation)
- It is distinct from the user-action audit trail in audit.py
- It powers the event feed visible in the transaction detail sidebar

Commit with message: docs: add module docstrings clarifying audit vs event_log split
```

**Verify:** `grep -n '"""' apps/api/src/tc/db/models/audit.py apps/api/src/tc/db/models/event_log.py`

-----

## TASK 2 — Database: Document Intelligence Models

```
Create three new SQLAlchemy models for the document intelligence layer.
All files go in apps/api/src/tc/db/models/

Follow the exact same patterns as the existing models in that directory:
- Use the same Base class from db/base.py
- Use UUID primary keys with server_default=sa.text('gen_random_uuid()')
- Use the same created_at/updated_at patterns as existing models
- Add __repr__ methods consistent with the rest of the codebase
```

### 2a. Create apps/api/src/tc/db/models/documents.py

```python
"""
Document model — one row per uploaded PDF.

Status lifecycle: pending → processing → done | failed

A document is linked to a transaction after the agent clicks
"Create Transaction" on the extraction review page. Until then,
transaction_id is null.
"""

# Fields required:
# id: UUID, PK
# org_id: UUID, FK → orgs.id, NOT NULL
# transaction_id: UUID, FK → transactions.id, nullable
# filename: String, NOT NULL
# doc_type: String, nullable  # 'agreement_of_sale' | 'disclosure' | 'addendum' | 'other'
# raw_text: Text, nullable    # pypdf output, stored for debugging
# status: String, default='pending'  # pending | processing | done | failed
# created_at: DateTime, server_default=func.now()
# updated_at: DateTime, onupdate=func.now()
#
# Relationships:
# - org: back_populates on Org model (add if Org has a documents relationship)
# - extractions: one-to-many to Extraction
# - risk_flags: one-to-many to RiskFlag
# - transaction: many-to-one to Transaction (nullable)
```

### 2b. Create apps/api/src/tc/db/models/extractions.py

```python
"""
Extraction model — one row per field extracted from a document by Claude.

Extractions are keyed by field_name (e.g. 'buyer_name', 'close_date').
The field_value is always stored as a string; callers are responsible
for type-coercing dates, booleans, etc.

Confidence scores below 0.6 are flagged in the UI for agent review.
They are stored regardless — do not filter low-confidence extractions
before writing to the database.
"""

# Fields required:
# id: UUID, PK
# document_id: UUID, FK → documents.id, NOT NULL
# field_name: String, NOT NULL   # 'buyer_name', 'close_date', 'purchase_price', etc.
# field_value: Text, nullable    # null if Claude could not determine the value
# confidence: Float, nullable    # 0.0–1.0
# page_ref: Integer, nullable    # source page number if determinable
# created_at: DateTime, server_default=func.now()
#
# Relationships:
# - document: many-to-one to Document
```

### 2c. Create apps/api/src/tc/db/models/risk_flags.py

```python
"""
RiskFlag model — AI-identified risks in a document.

Risk flags are generated at extraction time and written once.
They are not recalculated unless the document is re-processed.

acknowledged=True means the agent has reviewed the flag and
marked it as intentional (e.g. a short inspection window that
was a deliberate negotiation decision). Acknowledged flags are
removed from the active risk panel but remain in the audit trail.
"""

# Fields required:
# id: UUID, PK
# document_id: UUID, FK → documents.id, NOT NULL
# flag_type: String, NOT NULL
#   # 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect'
# severity: String, NOT NULL  # 'low' | 'medium' | 'high'
# title: String, NOT NULL     # short label, e.g. "Short inspection window"
# explanation: Text, NOT NULL # plain English description for agents
# acknowledged: Boolean, default=False, NOT NULL
# acknowledged_by: UUID, FK → users.id, nullable
# acknowledged_at: DateTime, nullable
# acknowledged_note: Text, nullable  # agent's reason for acknowledging
# created_at: DateTime, server_default=func.now()
#
# Relationships:
# - document: many-to-one to Document
# - acknowledger: many-to-one to User (nullable)
```

### 2d. Export new models from db/models/**init**.py

```
Open apps/api/src/tc/db/models/__init__.py
Add imports for Document, Extraction, RiskFlag so they are
accessible as tc.db.models.Document etc.
Follow the existing import pattern in that file exactly.
```

### 2e. Write the Alembic migration

```
Generate a new Alembic migration that creates three tables:
documents, extractions, risk_flags

File: apps/api/src/tc/db/migrations/versions/xxxx_add_document_intelligence.py

The migration must:
1. Create tables in this order: documents → extractions → risk_flags
   (FK dependencies require this order)
2. Add indexes:
   - ix_documents_org_id on documents(org_id)
   - ix_documents_transaction_id on documents(transaction_id)
   - ix_documents_status on documents(status)
   - ix_extractions_document_id on extractions(document_id)
   - ix_extractions_field_name on extractions(field_name)
   - ix_risk_flags_document_id on risk_flags(document_id)
   - ix_risk_flags_severity on risk_flags(severity)
3. Write a proper downgrade() that drops tables in reverse order:
   risk_flags → extractions → documents
4. Use a descriptive revision message: 'add document intelligence tables'

Do not use --autogenerate for this migration — write it manually from the models.
Autogenerate can miss FK constraints and index types.
```

**Verify:** `cd apps/api && uv run alembic check` should show the new migration as pending.
Apply it: `uv run alembic upgrade head`
Confirm tables exist: `uv run python -c "from tc.db.models import Document, Extraction, RiskFlag; print('OK')"`

-----

## TASK 3 — Backend: Document Intelligence Service

### 3a. Add pypdf and anthropic to pyproject.toml

```
Open apps/api/pyproject.toml
Add to the dependencies list:
  anthropic>=0.40.0
  pypdf>=4.0.0

Then run: uv sync
```

### 3b. Create apps/api/src/tc/services/document_intelligence.py

```python
"""
Document intelligence service — PDF extraction via Claude.

This is the only file in the codebase that calls the Anthropic API.
No other service or endpoint should import anthropic directly.

Extraction flow:
1. extract_text_from_pdf(pdf_bytes) → raw text string (truncated to 12k chars)
2. run_extraction(pdf_bytes) → dict with keys: doc_type, extractions, risk_flags, summary
3. Caller (documents endpoint) is responsible for writing results to the database

Error handling:
- If pypdf fails to parse the PDF, raise ValueError("Could not extract text from PDF")
- If Claude returns malformed JSON, retry once with a stricter prompt
- If retry also fails, raise ValueError("Claude returned unparseable response")
- Never return partial results — either the full extraction dict or raise
"""

# Implementation requirements:

# 1. PDF validation
# Before extracting text, verify the first 5 bytes are b'%PDF-'
# If not: raise ValueError("File does not appear to be a valid PDF")

# 2. Text extraction
# Use pypdf.PdfReader to extract text from all pages
# Concatenate page text with a newline between pages
# Truncate final string to 12000 characters
# If total extracted text is under 100 characters, raise ValueError("PDF appears to be empty or image-only")

# 3. Claude extraction prompt
# The prompt must:
# a. Instruct Claude to return ONLY valid JSON — no preamble, no markdown fences
# b. Wrap user document text between explicit delimiters:
#    ---DOCUMENT TEXT BEGINS---
#    {raw_text}
#    ---DOCUMENT TEXT ENDS---
# c. Include the exact JSON schema below
# d. Instruct Claude to use null (not the string "null") for missing date fields
#
# Required JSON schema for Claude to return:
# {
#   "doc_type": "agreement_of_sale | disclosure | addendum | other",
#   "extractions": [
#     {"field_name": "buyer_name",               "field_value": "...", "confidence": 0.95},
#     {"field_name": "seller_name",              "field_value": "...", "confidence": 0.95},
#     {"field_name": "property_address",         "field_value": "...", "confidence": 0.98},
#     {"field_name": "purchase_price",           "field_value": "...", "confidence": 0.90},
#     {"field_name": "close_date",               "field_value": "YYYY-MM-DD or null", "confidence": 0.90},
#     {"field_name": "inspection_deadline",      "field_value": "YYYY-MM-DD or null", "confidence": 0.85},
#     {"field_name": "financing_contingency_date","field_value": "YYYY-MM-DD or null", "confidence": 0.85},
#     {"field_name": "earnest_money",            "field_value": "...", "confidence": 0.90},
#     {"field_name": "inspection_contingency",   "field_value": "yes | no | unclear",  "confidence": 0.85},
#     {"field_name": "financing_contingency",    "field_value": "yes | no | unclear",  "confidence": 0.85},
#     {"field_name": "appraisal_contingency",    "field_value": "yes | no | unclear",  "confidence": 0.80}
#   ],
#   "risk_flags": [
#     {
#       "flag_type": "tight_deadline | missing_clause | unusual_condition | unclear_language | material_defect",
#       "severity": "low | medium | high",
#       "title": "Short inspection window",
#       "explanation": "Inspection deadline is only 5 days from acceptance..."
#     }
#   ],
#   "summary": "2-3 sentence plain English summary for a first-time buyer."
# }

# 4. JSON parsing
# Use regex to strip accidental markdown fences before parsing:
#   clean = re.sub(r'```json?\n?|```', '', response_text).strip()
# Then json.loads(clean)
# If json.loads raises, retry Claude once before raising ValueError

# 5. Model string
# Always use: "claude-sonnet-4-20250514"
# Always use: max_tokens=2000
# The Anthropic client reads ANTHROPIC_API_KEY from environment automatically
```

### 3c. Create test fixture file

```
Create: apps/api/src/tc/tests/fixtures/extraction_response.json

This file is the canned Claude response used in all document intelligence tests.
It must be valid JSON matching the schema above and represent a realistic
Pennsylvania Agreement of Sale for:
  Buyer: Sarah Mitchell
  Seller: James and Carol Park
  Address: 123 Maple Street, Anytown PA 19001
  Price: $425,000
  Close date: 2026-03-28
  Inspection deadline: 2026-03-08 (5 days — triggers a tight_deadline HIGH flag)
  Financing contingency date: 2026-03-15
  Earnest money: $8,500
  All three contingencies: yes

Include at least 3 risk flags:
  1. HIGH — tight_deadline — "Short inspection window (5 days)"
  2. MEDIUM — missing_clause — "No radon contingency noted"
  3. LOW — missing_clause — "HOA document request not included"
```

### 3d. Write tests for document intelligence

```
Create: apps/api/src/tc/tests/test_document_intelligence.py

Tests to write:
1. test_pdf_magic_byte_validation — non-PDF bytes raise ValueError
2. test_empty_pdf_raises — PDF with < 100 chars extracted raises ValueError
3. test_extraction_returns_correct_fields — mock Claude, verify all 11 fields present
4. test_confidence_scores_present — all extractions have a confidence float 0.0–1.0
5. test_risk_flags_present — mock returns fixture with 3 flags, all stored
6. test_json_fence_stripping — response wrapped in ```json ... ``` parses correctly
7. test_malformed_json_retries_once — first call returns garbage, second returns valid JSON
8. test_malformed_json_both_calls_fail_raises — both calls return garbage, raises ValueError

Use the mock_anthropic fixture pattern from conftest.py.
Load fixture JSON from tests/fixtures/extraction_response.json.
Never call the live Anthropic API in tests.
```

**Verify:** `cd apps/api && uv run pytest tests/test_document_intelligence.py -v`

-----

## TASK 4 — Backend: Documents API Endpoint

### 4a. Create apps/api/src/tc/api/v1/documents.py

```python
"""
Documents API — PDF upload, extraction review, transaction creation.

Endpoints:
  POST   /documents/upload                        — upload PDF, run extraction, return results
  GET    /documents/{document_id}                 — get document record + status
  GET    /documents/{document_id}/risk-flags      — list risk flags for a document
  POST   /documents/{document_id}/create-transaction  — create Transaction from extraction data
  PATCH  /documents/{document_id}/risk-flags/{flag_id}/acknowledge — mark flag as intentional
"""

# POST /documents/upload implementation requirements:
#
# 1. File validation (before reading bytes):
#    - Reject if content_type is not application/pdf
#    - Read up to MAX_SIZE + 1 bytes where MAX_SIZE = 10 * 1024 * 1024 (10MB)
#    - Reject with 400 if len(bytes) > MAX_SIZE
#    - Validate magic bytes: first 5 bytes must be b'%PDF-'
#    - Reject with 400 if validation fails
#
# 2. Create Document row with status='processing', flush (don't commit yet)
#
# 3. Call document_intelligence.run_extraction(pdf_bytes)
#    - On ValueError: set doc.status = 'failed', commit, raise HTTPException(422, detail=str(e))
#    - On any other exception: set doc.status = 'failed', commit, raise HTTPException(500, ...)
#
# 4. On success:
#    - Set doc.doc_type and doc.status = 'done'
#    - Write one Extraction row per field in result['extractions']
#    - Write one RiskFlag row per flag in result['risk_flags']
#    - Commit once — all writes in a single transaction
#    - Return the full extraction payload
#
# POST /documents/{id}/create-transaction requirements:
#
# 1. Idempotency guard:
#    - Query Transaction where source_document_id = document_id
#    - If found, return 200 with existing transaction_id (do not raise 409 — idempotent behavior)
#    - Add source_document_id column to Transaction model if it doesn't exist
#      (check db/models/transaction.py first)
#
# 2. Build field map from Extraction rows:
#    extractions = {e.field_name: e.field_value for e in ...}
#
# 3. Parse close_date safely:
#    try: close_date = date.fromisoformat(extractions.get('close_date'))
#    except: close_date = None
#
# 4. Create Transaction, link doc.transaction_id, commit
#
# 5. Dispatch Celery task: generate_timeline.delay(str(tx.id))
#    Import from workers.celery_tasks (the renamed file from Task 1b)
#
# 6. Write to audit trail: audit_service.log(action='transaction_created_from_document', ...)
#
# PATCH /documents/{id}/risk-flags/{flag_id}/acknowledge requirements:
# - Verify flag belongs to a document owned by the current org
# - Set acknowledged=True, acknowledged_by=current_user.id, acknowledged_at=now()
# - Store the note from request body in acknowledged_note
# - Write to audit trail
# - Return updated flag
```

### 4b. Wire documents router into api/v1/router.py

```
Open apps/api/src/tc/api/v1/router.py
Import the documents router from .documents
Add: router.include_router(documents_router, prefix="/documents", tags=["documents"])

Follow the exact same pattern used for the existing routers in that file.
```

### 4c. Check Transaction model for source_document_id

```
Open apps/api/src/tc/db/models/transaction.py
Check if source_document_id column exists.
If not, add it:
  source_document_id: Mapped[Optional[UUID]] = mapped_column(
      UUID(as_uuid=True),
      ForeignKey('documents.id'),
      nullable=True,
      index=True
  )

If you add this column, generate a new migration:
  uv run alembic revision --autogenerate -m "add source_document_id to transactions"
Then apply: uv run alembic upgrade head
```

**Verify:**

```bash
cd apps/api
uv run python -c "
from tc.api.v1.documents import router
print([r.path for r in router.routes])
"
```

Expected output includes: /upload, /{document_id}, /{document_id}/risk-flags,
/{document_id}/create-transaction, /{document_id}/risk-flags/{flag_id}/acknowledge

**Verify full API starts:**

```bash
uv run uvicorn src.tc.main:app --port 8001 &
curl http://localhost:8001/api/v1/documents/upload -X POST
# Should return 401 (auth required), not 404 (route not found)
kill %1
```

-----

## TASK 5 — Backend: Verify seed_db.py is demo-ready

```
Open scripts/seed_db.py and read its current contents.

Verify it seeds the following — if any are missing, add them:

1. One org named "Estora Demo Org"
2. One user: Cooper Williams, cooper@estora.app, role=agent
3. Three active transactions in varying health states:
   a. 123 Maple St, Anytown PA — close date 7 days from now — health score ~55 (amber)
      Has 2 overdue tasks, 1 unacknowledged HIGH risk flag
   b. 88 Park Ave, Springfield PA — close date 21 days from now — health score ~78 (green)
      All tasks on track
   c. 47 Oak Lane, Riverside PA — close date 45 days from now — health score ~90 (green)
      Early stage, no overdue tasks
4. For transaction (a), seed one Document row with status='done' and realistic extractions
   so the extraction review page renders without a live upload during demo

Use realistic addresses. Use ISO date arithmetic from today's date, not hardcoded dates,
so the seed data is always valid relative to when it's run.

After verifying/updating seed_db.py:
docker compose -f infra/docker-compose.yml exec api uv run python /app/scripts/seed_db.py
Confirm no errors.
```

-----

## TASK 6 — Frontend: Foundation

### 6a. Install required frontend dependencies

```
cd apps/web
npm install
```

Verify `package.json` has at minimum:

- `next` 14+
- `tailwindcss`
- `typescript`

If any are missing, add them with `npm install <package>`.

### 6b. Update apps/web/src/app/layout.tsx

```tsx
// layout.tsx must:
// 1. Import DM Serif Display, DM Sans, DM Mono from Google Fonts
// 2. Set background color #0C0C0B as the root background (via body className or global CSS)
// 3. Set font-family to DM Sans as the default body font
// 4. Export metadata with title "Estora" and description "Real estate transaction intelligence"
//
// Google Fonts link:
// https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Mono:wght@400;500&display=swap
//
// The layout should render children inside a div with:
//   style={{ background: '#0C0C0B', minHeight: '100vh', color: '#E8E6DF' }}
```

### 6c. Create apps/web/src/app/globals.css

```css
/* globals.css — design system tokens and base resets */

/* Import this in layout.tsx */

:root {
  --bg:         #0C0C0B;
  --surface:    #141413;
  --border:     #2A2A28;
  --text:       #E8E6DF;
  --muted:      #7A7870;
  --amber:      #D4880A;
  --amber-bg:   #1C1609;
  --red:        #C0392B;
  --red-bg:     #1A0A09;
  --yellow:     #B8860B;
  --yellow-bg:  #1A1609;
  --green:      #1A6B4A;
  --green-text: #4CAF7D;
  --green-bg:   #091A10;
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --font-serif: 'DM Serif Display', Georgia, serif;
  --font-sans:  'DM Sans', system-ui, sans-serif;
  --font-mono:  'DM Mono', 'Courier New', monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Stagger animation for extraction rows */
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.extraction-row {
  animation: fadeSlideIn 200ms ease forwards;
  animation-delay: calc(var(--i, 0) * 50ms);
  opacity: 0;
}

/* Pulse animation for overdue task dots */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.pulse { animation: pulse 1.5s ease-in-out infinite; }

/* Monospace data — addresses, dates, IDs */
.mono { font-family: var(--font-mono); }
```

### 6d. Update apps/web/src/lib/types.ts

```typescript
// Ensure types.ts contains interfaces for all API response shapes.
// Add any that are missing:

export interface Extraction {
  field_name: string
  field_value: string | null
  confidence: number
  page_ref?: number | null
}

export interface RiskFlag {
  id: string
  flag_type: 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect'
  severity: 'low' | 'medium' | 'high'
  title: string
  explanation: string
  acknowledged: boolean
  acknowledged_at?: string | null
  acknowledged_note?: string | null
}

export interface Document {
  id: string
  filename: string
  doc_type: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  created_at: string
}

export interface ExtractionResult {
  document_id: string
  doc_type: string
  summary: string
  extractions: Extraction[]
  risk_flags: RiskFlag[]
  extraction_count: number
  risk_count: number
}

export interface Transaction {
  id: string
  title: string
  status: string
  close_date: string | null
  health_score: number | null
  health_status: 'green' | 'yellow' | 'red' | null
  property_address?: string
}

export interface HealthScore {
  score: number
  status: 'green' | 'yellow' | 'red'
  overdue: number
  due_soon: number
  on_track: number
  calculated_at: string
}

export interface Task {
  id: string
  title: string
  assignee_role: string
  due_date: string | null
  status: 'pending' | 'in_progress' | 'complete' | 'overdue'
  priority: 'low' | 'medium' | 'high'
}

export interface Milestone {
  id: string
  label: string
  due_date: string | null
  status: 'complete' | 'upcoming' | 'overdue'
  milestone_type: string
}

export interface AuditEntry {
  id: string
  actor_name: string
  action: string
  detail: string
  created_at: string
}
```

### 6e. Update apps/web/src/lib/api.ts

```typescript
// Ensure api.ts has typed wrappers for all endpoints used by the UI.
// Add any that are missing. All functions must:
// 1. Accept token: string as final parameter
// 2. Return typed promises using interfaces from types.ts
// 3. Throw on non-2xx responses with the error message from the response body

// Required functions:
// getDevToken(email?: string): Promise<string>
// uploadDocument(file: File, token: string): Promise<ExtractionResult>
// getDocument(id: string, token: string): Promise<Document>
// getRiskFlags(documentId: string, token: string): Promise<RiskFlag[]>
// acknowledgeRiskFlag(documentId: string, flagId: string, note: string, token: string): Promise<RiskFlag>
// createTransactionFromDoc(documentId: string, token: string): Promise<Transaction>
// listTransactions(token: string): Promise<Transaction[]>
// getTransaction(id: string, token: string): Promise<Transaction>
// getHealth(transactionId: string, token: string): Promise<HealthScore>
// getTimeline(transactionId: string, token: string): Promise<Milestone[]>
// getTasks(transactionId: string, token: string): Promise<Task[]>
// updateTaskStatus(transactionId: string, taskId: string, status: string, token: string): Promise<Task>
// getAuditLog(transactionId: string, token: string): Promise<AuditEntry[]>
```

-----

## TASK 7 — Frontend: Components

Build all six components. They are shared across pages.
Create each in `apps/web/src/components/`.

### 7a. DocumentDropzone.tsx

```
Build a drag-and-drop PDF upload component.

Props:
  onUploadComplete: (result: ExtractionResult) => void
  token: string

Behavior:
  1. Renders a dashed-border drop zone with upload icon and label text:
     "Drop a contract PDF here, or click to upload"
     Subtext: "Agreements of Sale · Disclosures · Addenda"

  2. Accepts clicks to open file picker (input[type=file] accept=".pdf")

  3. On file drop or selection:
     a. Validate: only .pdf files, max 10MB client-side
        Show inline error if invalid: "Please upload a PDF under 10MB"
     b. Set state to 'uploading'
     c. Cycle through PROCESSING_STEPS every 800ms while waiting:
        ["Reading document...", "Identifying parties...",
         "Extracting key dates...", "Flagging potential risks...",
         "Building timeline..."]
        Display current step as animated text below the icon
     d. Call api.uploadDocument(file, token)
     e. On success: call onUploadComplete(result)
     f. On error: show error state with message and a "Try again" button

  4. Visual states:
     - idle: dashed border var(--border), background var(--surface)
     - drag-over: border var(--amber), background var(--amber-bg)
     - uploading: spinner or animated step text, no border change
     - error: border var(--red), red error message below

  5. Use CSS only for the cycling animation — no external animation library

Styling rules:
  - Border radius: var(--radius-lg)
  - Minimum height: 160px
  - Processing step text: font-family var(--font-mono), color var(--muted)
  - Use a subtle blinking cursor after the step text (CSS ::after with blink animation)
```

### 7b. ExtractionViewer.tsx

```
Displays the structured extraction results from a document.

Props:
  extractions: Extraction[]
  summary: string

Behavior:
  Renders two sections:

  Section 1 — AI Summary
  A blockquote-style container with left amber border, italic text.
  The summary text from Claude.

  Section 2 — Extracted Fields
  A table-like list of field name → value rows.
  Each row fades in with the extraction-row stagger animation.
  The --i CSS custom property must be set as inline style: style={{ '--i': index }}
  
  Field display names (map from field_name to label):
    buyer_name              → Buyer
    seller_name             → Seller
    property_address        → Property
    purchase_price          → Price
    close_date              → Close date
    inspection_deadline     → Inspection deadline
    financing_contingency_date → Financing letter due
    earnest_money           → Earnest money
    inspection_contingency  → Inspection contingency
    financing_contingency   → Financing contingency
    appraisal_contingency   → Appraisal contingency

  Confidence display:
    confidence >= 0.8: no indicator
    confidence >= 0.6: show a small amber dot ● with tooltip "Claude is moderately confident"
    confidence < 0.6:  show a small red dot ● with tooltip "Low confidence — verify manually"

  Date values should be formatted as human-readable: "March 28, 2026" not "2026-03-28"
  Monetary values are displayed as-is (they come pre-formatted from Claude)
  Property address uses font-family: var(--font-mono)
```

### 7c. RiskFlagPanel.tsx

```
Displays a list of risk flags with severity indicators.

Props:
  flags: RiskFlag[]
  documentId: string
  token: string
  onFlagAcknowledged?: (flagId: string) => void

Behavior:
  If no flags: render a single line "No risks identified" with a green checkmark.

  For each flag:
  - A card with left border color based on severity:
      high:   border-left: 3px solid var(--red);   background: var(--red-bg)
      medium: border-left: 3px solid var(--yellow); background: var(--yellow-bg)
      low:    border-left: 3px solid var(--green);  background: var(--green-bg)
  - Severity badge: "HIGH" / "MED" / "LOW" in matching color, uppercase, font-size 10px, letter-spacing 0.1em
  - Flag title: DM Sans medium weight
  - Explanation text: DM Sans 13px, color var(--muted), line-height 1.6
  - If acknowledged: render with reduced opacity (0.5) and a "✓ Acknowledged" label instead of the action button
  - If not acknowledged: render an "Acknowledge" button (small, ghost style)

  Acknowledge flow:
  - Clicking "Acknowledge" opens an inline textarea:
    "Why is this not a concern? (optional)"
    with a "Confirm" button
  - On confirm: call api.acknowledgeRiskFlag(documentId, flag.id, note, token)
  - On success: call onFlagAcknowledged(flag.id), update local state to show acknowledged
  - On error: show inline error message

  Sort order: high → medium → low, unacknowledged before acknowledged
```

### 7d. TimelineView.tsx

```
Renders a vertical milestone timeline.

Props:
  milestones: Milestone[]

Visual design:
  A vertical rail of dots connected by a line.
  Each milestone is:
    - A dot (12px circle) on the rail
    - A label to the right in DM Sans
    - A date to the far right in DM Mono, color var(--muted)

  Dot styles by status:
    complete: filled amber dot (#D4880A), solid
    upcoming: hollow dot, border 1.5px solid var(--border)
    overdue:  filled red dot (#C0392B) with the pulse CSS animation class

  The connecting line between dots:
    Completed segments: color var(--amber), 2px solid
    Upcoming segments:  color var(--border), 1px dashed

  The close date milestone is always last and styled differently:
    Larger dot (16px), label in DM Serif Display, "Settlement" label below date

  If milestones is empty: render "Timeline is being generated..." in muted italic text
```

### 7e. HealthBar.tsx

```
Vertical mercury-style health bar. NOT a donut chart.

Props:
  score: number        // 0–100
  status: 'green' | 'yellow' | 'red'
  overdue: number
  due_soon: number
  on_track: number

Visual design:
  Left side: large score number
    - Font: DM Serif Display, 64px
    - Color: based on status (green-text / --yellow / --red)

  Right side: vertical bar track
    - Track: 6px wide, 120px tall, background var(--border), border-radius 3px
    - Fill: height = (score / 100) * 120px, filled from bottom
    - Fill color: based on status
    - Fill has a 600ms CSS transition on height for smooth changes
    - CSS transition: transition: height 600ms cubic-bezier(0.4, 0, 0.2, 1)

  Below the bar:
    Three stat lines in DM Mono 11px:
    - "{overdue} overdue" in var(--red) (if overdue > 0) or var(--muted) (if 0)
    - "{due_soon} due soon" in var(--yellow) (if due_soon > 0) or var(--muted) (if 0)
    - "{on_track} on track" in var(--green-text)

  Label above bar: "HEALTH" in 10px uppercase letter-spaced var(--muted) text

  Do not use any charting library for this component.
```

### 7f. TaskList.tsx

```
Renders a list of tasks with completion toggling.

Props:
  tasks: Task[]
  transactionId: string
  token: string
  onTaskUpdated?: (task: Task) => void

Visual design:
  Group tasks by status: overdue first, then pending/in_progress, then complete.

  Each task row:
  - A checkbox (custom styled, not browser default)
    complete:  filled amber square checkmark ✓
    overdue:   red hollow square
    pending:   grey hollow square
  - Task title in DM Sans
  - Due date in DM Mono 11px var(--muted) — format as "Mar 28"
  - Priority badge: HIGH / MED / LOW (only show for high priority tasks)
  - Assignee role in 10px uppercase var(--muted): "AGENT" / "TC" / "BUYER"

  Clicking a checkbox toggles the task to 'complete' if it was pending/overdue.
  Call api.updateTaskStatus(transactionId, task.id, 'complete', token)
  Optimistically update the UI before the API call returns.
  On error: revert the optimistic update and show a toast-style error.

  Section dividers between groups:
    "2 OVERDUE" / "5 UPCOMING" / "3 COMPLETE"
    in 10px uppercase var(--muted), with a horizontal rule
```

**Verify components compile:**

```bash
cd apps/web && npm run tsc --noEmit
```

No type errors expected.

-----

## TASK 8 — Frontend: Pages

### 8a. Create apps/web/src/app/page.tsx

```tsx
// Root page — redirect to /dashboard
// Use Next.js redirect() from 'next/navigation'
// This should be a server component (no 'use client' directive)
```

### 8b. Create apps/web/src/app/dashboard/page.tsx

```
Build the command center — upload + active deals list.

Auth: On mount, call api.getDevToken() and store in sessionStorage as 'estora_token'.
Check sessionStorage first to avoid re-fetching on every render.

Layout:
  Header bar:
    - Left: "ESTORA" in DM Mono 13px letter-spaced, color var(--amber)
    - Right: nothing for now (placeholder for user menu)
    - Bottom border: 1px solid var(--border)

  Main content, two sections:

  Section 1 — Upload area
    Title: "Upload a contract" in DM Serif Display 22px
    Subtitle: "Drop a PDF to extract fields, deadlines, and risks automatically" in var(--muted)
    Render <DocumentDropzone token={token} onUploadComplete={handleUploadComplete} />
    
    handleUploadComplete: navigate to /dashboard/documents/{result.document_id}
    Use Next.js useRouter() for navigation.

  Section 2 — Active deals list
    Title: "Active deals" with a count badge: "3 active"
    
    Fetch: api.listTransactions(token) on mount
    Show loading skeleton (3 placeholder rows) while fetching
    
    Each deal row:
    - Property address in DM Sans medium weight
    - Health indicator: colored dots based on health_status
        red:    "●●●" in var(--red)
        yellow: "●●○" in var(--yellow)  
        green:  "●○○" in var(--green-text)
    - Close date in DM Mono: "Closes Mar 28"
    - Entire row is clickable → navigates to /dashboard/transactions/{id}
    - Hover: background var(--surface), cursor pointer

    Empty state: "No active deals. Upload a contract to get started."
    Error state: "Could not load deals. Check your connection." with retry button.
```

### 8c. Create apps/web/src/app/dashboard/documents/[id]/page.tsx

```
Build the extraction review page — this is the money shot of the demo.

Fetch on mount:
  - api.getDocument(id, token) for document metadata
  - The extraction data should come from the upload flow via sessionStorage or
    re-fetch from the document endpoint if navigating directly
    Store ExtractionResult in sessionStorage keyed by document_id after upload
    On this page: check sessionStorage first, fall back to fetching from API

Layout — two column (single column on mobile):

Left column (1/3 width):
  Document card:
    - Filename in DM Mono 13px
    - doc_type formatted as human readable: "Agreement of Sale"
    - Status badge: "PROCESSED" in green or "PROCESSING" in amber
    - Uploaded timestamp: "just now" or formatted date
    - A subtle divider
    - Summary section header: "AI Summary" in 10px uppercase var(--muted)

Right column (2/3 width):
  AI Summary:
    Render the summary text from Claude in an italic blockquote style
    Left border 2px solid var(--amber), padding 12px 16px, background var(--amber-bg)

  Extracted fields:
    Count badge: "12 FIELDS" in var(--muted)
    Render <ExtractionViewer extractions={extractions} summary={summary} />

  Risk flags:
    Count badge: "3 RISKS" styled by max severity (red for any HIGH, yellow for any MED)
    Render <RiskFlagPanel flags={flags} documentId={id} token={token} />

  CTA button at bottom:
    "Create Transaction →"
    Style: background var(--amber), color #0C0C0B, DM Sans medium, padding 10px 24px
    border-radius var(--radius-md)
    On click: call api.createTransactionFromDoc(id, token)
    While loading: show "Creating..." and disable the button
    On success: navigate to /dashboard/transactions/{transaction_id}
    On error: show inline error message below the button
```

### 8d. Create apps/web/src/app/dashboard/transactions/[id]/page.tsx

```
Build the transaction nerve center — this is the full deal view.

Fetch on mount (parallel with Promise.all):
  - api.getTransaction(id, token)
  - api.getHealth(id, token)
  - api.getTimeline(id, token)
  - api.getTasks(id, token)

Show a loading skeleton while all four requests resolve.

Layout — three column (stack on tablet/mobile):

Top bar:
  - "← Back" link to /dashboard in DM Mono 12px
  - Property address in DM Serif Display 20px (center or left)
  - Status badge: "ACTIVE" in green uppercase 10px
  - Buyer name · Seller name in var(--muted) below the address

Column 1 — Timeline (1/3 width):
  Section label: "TIMELINE" in 10px uppercase var(--muted)
  Render <TimelineView milestones={milestones} />

Column 2 — Health (1/3 width):
  Section label: "HEALTH" in 10px uppercase var(--muted)
  Render <HealthBar
    score={health.score}
    status={health.status}
    overdue={health.overdue}
    due_soon={health.due_soon}
    on_track={health.on_track}
  />

Column 3 — Tasks + Risk Flags (1/3 width):
  Section label: "TASKS" in 10px uppercase var(--muted)
  Render <TaskList tasks={tasks} transactionId={id} token={token} />
  
  Divider
  
  If the transaction has a linked document:
    Section label: "RISK FLAGS" in 10px uppercase var(--muted)
    Fetch risk flags: api.getRiskFlags(documentId, token)
    Render <RiskFlagPanel flags={flags} documentId={documentId} token={token} />

Error state: if any fetch fails, show the partial data that did load
with a subtle "Some data failed to load" notice. Do not blank the entire page.
```

**Verify the full demo loop runs:**

```bash
# Start full stack
docker compose -f infra/docker-compose.yml up -d

# Seed demo data
docker compose -f infra/docker-compose.yml exec api uv run python /app/scripts/seed_db.py

# Open browser to http://localhost:3000
# 1. Dashboard loads with 3 seeded deals — confirm
# 2. Upload a PDF — confirm processing animation plays
# 3. Extraction review renders with fields + risk flags — confirm
# 4. Click "Create Transaction" — confirm navigates to transaction detail
# 5. Transaction detail shows timeline, health bar, tasks — confirm
```

-----

## TASK 9 — Final cleanup

### 9a. Update docs/decisions/ with new ADR

```
Create: docs/decisions/0003-document-intelligence.md

Contents:
  Title: Document Intelligence Architecture
  Date: today
  Status: Accepted
  
  Context:
    Estora needed a way to read real estate contracts and extract structured data.
  
  Decision:
    Claude (claude-sonnet-4-20250514) via the Anthropic API reads the raw text
    extracted from uploaded PDFs and returns structured JSON containing extractions
    and risk flags. The extraction runs synchronously in the request handler for
    the hackathon build. PDF text is truncated to 12,000 characters.
  
  Consequences:
    + Single implementation point for AI logic (document_intelligence.py)
    + No prompt injection possible via file metadata (we read raw text only)
    - Synchronous extraction blocks the event loop for 3-10 seconds under load
    - 12k character truncation drops the back half of long documents
    - Risk flags are calibrated for Pennsylvania AOS forms only
  
  Future:
    Move extraction to Celery queue. Implement section-aware chunking.
    Add state-specific rule sets.
```

### 9b. Update README.md

```
The current README.md may be stale or generic.
Update it to reflect the actual current state of the slopathon branch:
  - Replace any placeholder content with accurate information
  - Ensure the quickstart commands match the actual docker-compose file path
    (infra/docker-compose.yml, not docker-compose.yml at root)
  - Add a "Document Intelligence" section that describes what was built in this branch
  - Add the ANTHROPIC_API_KEY requirement to the environment variables section
  - Verify all commands in the README actually work
```

### 9c. Final lint and type check

```bash
# Python
cd apps/api && uv run ruff check src/ && uv run black src/ --check

# TypeScript
cd apps/web && npm run tsc --noEmit && npm run lint

# If any lint errors: fix them. Do not suppress warnings with eslint-disable
# unless you add a comment explaining why it's safe.
```

### 9d. Commit everything

```bash
git add -A
git status  # Review what's being committed — no .DS_Store, no .env files

git commit -m "feat: add document intelligence layer and full frontend

- Add Document, Extraction, RiskFlag models + migration
- Add document_intelligence service (Claude extraction via pypdf)
- Add /documents/* API endpoints with idempotency guards
- Add DocumentDropzone, ExtractionViewer, RiskFlagPanel components
- Add TimelineView, HealthBar, TaskList components  
- Add dashboard, extraction review, and transaction detail pages
- Update seed_db.py with demo-ready data
- Rename workers/tasks.py to celery_tasks.py
- Remove .DS_Store from git tracking
- Add ADR 0003 for document intelligence architecture"
```

-----

## Verification checklist

Before calling this branch done, walk through each item:

- [ ] `git ls-files | grep .DS_Store` returns nothing
- [ ] `grep -r "from tc.workers.tasks" apps/` returns nothing (all updated to celery_tasks)
- [ ] `uv run alembic current` shows head revision includes document intelligence tables
- [ ] `uv run pytest` passes with no failures
- [ ] `npm run tsc --noEmit` exits 0 with no type errors
- [ ] Dashboard loads at localhost:3000 with seeded deals visible
- [ ] PDF upload flow completes end-to-end without errors
- [ ] Extraction review page renders fields with stagger animation
- [ ] Risk flags display with correct severity colors
- [ ] “Create Transaction” button navigates to transaction detail
- [ ] Transaction detail renders timeline, health bar, and task list
- [ ] Health bar is a vertical bar, not a donut chart
- [ ] No purple colors anywhere in the UI
- [ ] Font stack is DM Serif Display / DM Sans / DM Mono (not Inter, not Roboto)
