# AGENTS.md — Multi-Agent Real Estate Document Ingestion

## Implementation Plan for Claude Code CLI

## Veris Sandbox Integration — docs.veris.ai

This file is the complete build prompt for the agent mesh that sits on top of the
Supabase schema (seed.sql) and the document intelligence layer (TASKS.md).

Read CLAUDE.md and TASKS.md before starting here.
The Supabase schema and all migrations must be applied before any agent runs.

-----

## Core design rule — read before writing any code

The agent proposes. The system decides.
Agents extract candidate values and emit structured payloads.
Deterministic backend services validate, normalize, and commit.
No agent has unrestricted database write access.
No agent calls db.commit() directly.

-----

## What Veris is and is not in this stack

Veris is NOT the ingestion framework. It does not run in production.
Veris is the simulation and certification layer you run BEFORE production.

Production path:
PDF upload → FastAPI → agent pipeline → Supabase/Postgres

Simulation path (Veris):
Synthetic contract scenario → Veris sandbox container → agent pipeline
→ simulated Postgres (real DB, Veris-seeded) → grader evaluates output

The same five agents run in both paths. The difference is the environment:
Production: real Supabase, real Anthropic API, real PDFs
Veris:      Veris-managed Postgres, Anthropic API (proxied for tracing), synthetic PDFs

Veris provides:

- An isolated container with your agent + a real Postgres instance + LLM proxy
- Scenario-aware data seeding into that Postgres before each simulation
- A simulated actor (the attorney or agent submitting the document)
- Graders that evaluate whether the pipeline produced correct findings
- Reports with root cause analysis when scenarios fail

-----

## Mandatory: read these existing files before writing any agent code

Before writing a single line in the agents/ directory:

1. Open domain/rules.py — read every rule completely.
   QAAgent must call existing rules, not duplicate them.
   If a rule exists for commitment date validation, call it. Don’t rewrite it.
1. Open services/task_service.py — read it completely.
   task_tools.create_task() is a thin wrapper around this, not a replacement.
   Match the exact function signature and field names.
1. Open services/health_service.py — read it completely.
   ingestion_service.commit_ingestion() must call compute_health_score()
   after the contract row is committed.
1. Open services/timeline_service.py — read it completely.
   ingestion_service.commit_ingestion() must dispatch generate_timeline
   after the contract row is committed.
1. Open services/event_log_service.py — read it completely.
   orchestrator._update_run_status() must call log_event() on every
   status transition so the event feed is populated.
1. Open services/audit_service.py — read the exact function signature
   for log(). Every tool write and every ingestion commit must call it.
1. Open db/models/**init**.py — every new model file you create must be
   exported here. Check what already exists before creating duplicates.

-----

## Architecture

```
User uploads PDF / scan / rider / disclosure
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  AGENT MESH  (apps/api/src/tc/agents/)           NEW LAYER       │
│                                                                  │
│  1. IntakeAgent      ── classifies document, decides routing     │
│         │                                                        │
│         ▼                                                        │
│  2. ExtractionAgent  ── emits structured candidate fields        │
│         │                                                        │
│         ▼                                                        │
│  3. ResolutionAgent  ── deduplicates people + properties         │
│         │                                                        │
│         ▼                                                        │
│  4. QAAgent          ── calls domain/rules.py + date/money checks│
│         │                                                        │
│         ▼                                                        │
│  5. CoordinatorAgent ── calls task_service, timeline_service     │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  DETERMINISTIC LAYER  (existing + new services)                  │
│  ingestion_service.py  ← NEW  enforces invariants, commits rows  │
│  resolution_service.py ← NEW  threshold-based dedup             │
│  qa_service.py         ← NEW  finding storage                    │
│  task_service.py       ← EXISTING — used by CoordinatorAgent     │
│  health_service.py     ← EXISTING — called after commit          │
│  timeline_service.py   ← EXISTING — dispatched after commit      │
│  audit_service.py      ← EXISTING — called on every write        │
│  event_log_service.py  ← EXISTING — called on status transitions │
│  domain/rules.py       ← EXISTING — called by QAAgent            │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  SUPABASE / POSTGRES                                             │
│  contracts  people  properties  contract_mortgages               │
│  contract_escrow  contract_closing_conditions                    │
│  ingestion_runs  agent_findings  review_queue  ← NEW TABLES      │
└──────────────────────────────────────────────────────────────────┘

           ┌──────────────────────────────────────────────────────┐
           │  VERIS SANDBOX  (simulation + certification only)    │
           │                                                      │
           │  .veris/veris.yaml        ← sandbox config           │
           │  .veris/Dockerfile.sandbox← agent image             │
           │  veris/scenarios/         ← 10 NY contract scenarios │
           │  veris/graders/           ← Python grader functions  │
           │                                                      │
           │  Runs BEFORE production. Same agents, sandbox DB.    │
           └──────────────────────────────────────────────────────┘
```

-----

## File Structure to Create

```
apps/api/src/tc/
├── agents/
│   ├── __init__.py
│   ├── base.py                    # BaseAgent, HandoffPayload, typed results
│   ├── intake_agent.py
│   ├── extraction_agent.py
│   ├── resolution_agent.py
│   ├── qa_agent.py                # Calls domain/rules.py — does not duplicate it
│   ├── coordinator_agent.py       # Calls task_service — does not duplicate it
│   ├── orchestrator.py
│   └── tools/
│       ├── __init__.py
│       ├── document_tools.py
│       ├── people_tools.py
│       ├── property_tools.py
│       ├── contract_tools.py      # READ-ONLY
│       └── task_tools.py          # Thin wrapper over task_service
├── db/
│   ├── models/
│   │   ├── ingestion_run.py       # NEW SQLAlchemy model
│   │   ├── agent_finding.py       # NEW SQLAlchemy model
│   │   └── review_queue.py        # NEW SQLAlchemy model
│   └── migrations/versions/
│       └── xxxx_add_agent_tables.py
├── services/
│   ├── ingestion_service.py       # NEW — commit layer
│   ├── resolution_service.py      # NEW — dedup thresholds
│   └── qa_service.py              # NEW — finding storage
└── tests/agents/
    ├── conftest.py
    ├── test_intake_agent.py
    ├── test_extraction_agent.py
    ├── test_resolution_agent.py
    ├── test_qa_agent.py
    └── test_orchestrator.py

# Veris sandbox (repo root level)
.veris/
├── veris.yaml                     # Sandbox config — postgres + HTTP actor
├── Dockerfile.sandbox             # Extends Veris base, adds uv + agent code
└── .dockerignore

veris/
├── scenarios/
│   ├── scenario_01_name_variant.yaml
│   ├── scenario_02_address_rider_mismatch.yaml
│   ├── scenario_03_price_inconsistency.yaml
│   ├── scenario_04_missing_commitment_date.yaml
│   ├── scenario_05_escrow_downpayment_mismatch.yaml
│   ├── scenario_06_firpta_missing.yaml
│   ├── scenario_07_attorney_escrow_conflict.yaml
│   ├── scenario_08_addendum_overrides_body.yaml
│   ├── scenario_09_ocr_date_corruption.yaml
│   └── scenario_10_duplicate_property_contract.yaml
├── graders/
│   ├── ingestion_grader.py        # Python evaluator functions
│   └── qa_grader.py
└── schemas/
    └── agent_schema.sql           # Schema file Veris applies to sandbox Postgres
```

-----

## SECTION 1 — Database: Agent Tables Migration

```
Before writing this migration, open db/models/__init__.py and read what is
already exported. Then create the three model files and update __init__.py.

────────────────────────────────────────────────
Step 1a — Create db/models/ingestion_run.py
────────────────────────────────────────────────

Use the exact same Base class, column patterns, and __repr__ style
as the existing model files in db/models/. Read two existing model
files first to match the pattern precisely.

Columns:
  id                uuid         PK default gen_random_uuid()
  document_id       uuid         FK → documents.id nullable
                                 (nullable: run may start before doc row exists)
  status            text         NOT NULL default 'pending'
                                 CHECK IN ('pending','intake','extracting',
                                 'resolving','qa','coordinating',
                                 'complete','needs_review','failed')
  intake_result     jsonb        nullable — IntakeAgent output
  extraction_result jsonb        nullable — ExtractionAgent output
  resolution_result jsonb        nullable — ResolutionAgent output
  qa_result         jsonb        nullable — QAAgent output
  coordinator_result jsonb       nullable — CoordinatorAgent output
  error_message     text         nullable
  trace_id          text         nullable — Veris/OpenAI trace ID
  started_at        timestamptz  NOT NULL default now()
  completed_at      timestamptz  nullable
  created_at        timestamptz  NOT NULL default now()
  updated_at        timestamptz  NOT NULL default now()

────────────────────────────────────────────────
Step 1b — Create db/models/agent_finding.py
────────────────────────────────────────────────

Columns:
  id                uuid         PK
  ingestion_run_id  uuid         FK → ingestion_runs.id ON DELETE CASCADE NOT NULL
  agent_name        text         NOT NULL
  finding_type      text         NOT NULL
                                 CHECK IN ('error','warning',
                                 'requires_human_review','info')
  field_path        text         NOT NULL  e.g. 'contract.commitment_date'
  clause_span       text         nullable
  message           text         NOT NULL
  suggested_fix     text         nullable
  resolved          boolean      NOT NULL default false
  resolved_by       uuid         FK → people.id nullable
  resolved_at       timestamptz  nullable
  resolution_note   text         nullable
  created_at        timestamptz  NOT NULL default now()
  updated_at        timestamptz  NOT NULL default now()

────────────────────────────────────────────────
Step 1c — Create db/models/review_queue.py
────────────────────────────────────────────────

Columns:
  id                  uuid   PK
  ingestion_run_id    uuid   FK → ingestion_runs.id ON DELETE CASCADE NOT NULL UNIQUE
  priority            text   NOT NULL default 'normal'
                             CHECK IN ('urgent','normal','low')
  reason              text   NOT NULL
  extraction_payload  jsonb  NOT NULL
  reviewer_id         uuid   FK → people.id nullable
  assigned_at         timestamptz nullable
  reviewed_at         timestamptz nullable
  decision            text   nullable CHECK IN ('approved','rejected','modified')
  decision_note       text   nullable
  created_at          timestamptz NOT NULL default now()
  updated_at          timestamptz NOT NULL default now()

────────────────────────────────────────────────
Step 1d — Export from db/models/__init__.py
────────────────────────────────────────────────

Open db/models/__init__.py.
Add imports for IngestionRun, AgentFinding, ReviewQueue.
Follow the exact existing import style — do not change anything else in this file.

────────────────────────────────────────────────
Step 1e — Write the Alembic migration
────────────────────────────────────────────────

File: db/migrations/versions/xxxx_add_agent_tables.py

Write manually — do not use --autogenerate for this migration.
Create tables in FK dependency order:
  ingestion_runs → agent_findings → review_queue

Add indexes:
  ix_ingestion_runs_document_id   on ingestion_runs(document_id)
  ix_ingestion_runs_status        on ingestion_runs(status)
  ix_ingestion_runs_started_at    on ingestion_runs(started_at)
  ix_agent_findings_run_id        on agent_findings(ingestion_run_id)
  ix_agent_findings_finding_type  on agent_findings(finding_type)
  ix_agent_findings_resolved      on agent_findings(resolved)
  ix_review_queue_run_id          on review_queue(ingestion_run_id)
  ix_review_queue_priority        on review_queue(priority)
  ix_review_queue_decision        on review_queue(decision)

Write downgrade() dropping tables in reverse order:
  review_queue → agent_findings → ingestion_runs

Verify:
  uv run alembic upgrade head
  uv run python -c "
  from tc.db.models import IngestionRun, AgentFinding, ReviewQueue
  print('Models OK')
  "

Commit: feat: add agent tables and SQLAlchemy models (ingestion_runs, agent_findings, review_queue)
```

-----

## SECTION 2 — Base Agent Types

```
Create apps/api/src/tc/agents/base.py

This file defines every shared type used across all five agents.
Read it before writing any agent implementation file.

────────────────────────────────────────────────
Required imports
────────────────────────────────────────────────

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Literal
from uuid import UUID
from sqlalchemy.orm import Session

────────────────────────────────────────────────
Type aliases
────────────────────────────────────────────────

DocumentType = Literal[
    "agreement_of_sale", "rider", "disclosure",
    "commitment_letter", "title_report",
    "addendum", "escrow_agreement", "unknown"
]

ProcessingPriority = Literal["urgent", "normal", "low"]

FindingType = Literal["error", "warning", "requires_human_review", "info"]

AgentName = Literal[
    "intake_agent", "extraction_agent", "resolution_agent",
    "qa_agent", "coordinator_agent"
]

────────────────────────────────────────────────
Dataclasses — one per agent output
────────────────────────────────────────────────

@dataclass
class AgentFindingDTO:
    """
    A typed finding. Stored in agent_findings table via qa_service.store_findings().
    Agents append findings here. Agents never write to the DB directly.
    """
    agent_name:    AgentName
    finding_type:  FindingType
    field_path:    str
    message:       str
    clause_span:   str | None = None
    suggested_fix: str | None = None


@dataclass
class IntakeResult:
    document_type:          DocumentType
    processing_priority:    ProcessingPriority
    requires_human_review:  bool
    routing_notes:          str
    linked_contract_number: str | None = None


@dataclass
class ExtractionCandidate:
    """
    A single field extracted by ExtractionAgent.
    Never written to DB by the agent — passed to ingestion_service.
    """
    field_path:  str    # Dot-path: "contract.purchase_price"
    value:       Any
    confidence:  float  # 0.0–1.0
    source_span: str | None = None


@dataclass
class ExtractionResult:
    candidates: list[ExtractionCandidate]
    findings:   list[AgentFindingDTO]
    raw_summary: str


@dataclass
class ResolutionProposal:
    """
    Proposed match between extracted text and an existing DB row.
    resolution_service applies thresholds and decides — not the agent.
    """
    entity_type:     Literal["person", "property"]
    extracted_text:  str
    proposed_id:     UUID | None   # None = no match found
    match_score:     float
    match_reason:    str
    requires_review: bool


@dataclass
class ResolutionResult:
    proposals: list[ResolutionProposal]
    findings:  list[AgentFindingDTO]


@dataclass
class QAResult:
    findings:        list[AgentFindingDTO]
    auto_approvable: bool
    block_reason:    str | None


@dataclass
class CoordinatorResult:
    tasks_created:       list[str]
    reminders_scheduled: list[str]
    escalations_opened:  list[str]
    notes:               str


@dataclass
class HandoffPayload:
    """
    Pipeline state. Passed through each agent in sequence.
    Each agent reads previous results and adds its own.
    No agent mutates fields set by a previous agent.
    all_findings is the only field all agents append to.
    """
    ingestion_run_id:   UUID
    document_id:        UUID
    pdf_bytes:          bytes

    intake_result:      IntakeResult      | None = None
    extraction_result:  ExtractionResult  | None = None
    resolution_result:  ResolutionResult  | None = None
    qa_result:          QAResult          | None = None
    coordinator_result: CoordinatorResult | None = None

    all_findings: list[AgentFindingDTO] = field(default_factory=list)


────────────────────────────────────────────────
BaseAgent abstract class
────────────────────────────────────────────────

class BaseAgent(ABC):
    """
    Agents must NOT:
      - Call db.commit()
      - Import anthropic directly (use tool functions)
      - Duplicate logic that exists in domain/rules.py or existing services
      - Mutate HandoffPayload fields set by previous agents

    Agents must:
      - Return HandoffPayload with their result field populated
      - Append findings to payload.all_findings (not replace)
      - Raise AgentError if they cannot complete
    """
    name: AgentName

    @abstractmethod
    def run(self, payload: HandoffPayload, db: Session) -> HandoffPayload:
        ...


class AgentError(Exception):
    def __init__(self, agent_name: AgentName, message: str):
        self.agent_name = agent_name
        self.message = message
        super().__init__(f"[{agent_name}] {message}")

Commit: feat: add base agent types, HandoffPayload, and BaseAgent abstract class
```

-----

## SECTION 3 — Tool Layer

```
The tool layer is the only code that touches the database.
Agents call tools. Tools do the actual DB reads.
Writes happen only in services/, never in tools/.

────────────────────────────────────────────────
TASK 3a — agents/tools/people_tools.py
────────────────────────────────────────────────

READ-ONLY tools. ResolutionAgent calls these.

Before writing: open db/models/user.py (or whatever the people model is named)
to confirm the exact column names. Match them precisely.

Functions:

def search_people_by_name(first_name, last_name, db, limit=5) -> list[dict]:
    """
    ilike search on first_name + last_name.
    Returns serialized dicts — never raw ORM objects.
    Include: id, first_name, last_name, email, city, phone, masked_tax_id
    """

def search_people_by_email(email, db) -> dict | None:
    """Exact match on lower(email). Highest-confidence dedup signal."""

def search_people_by_phone(phone, db) -> dict | None:
    """Exact match after stripping non-digit characters from both sides."""

def compute_name_similarity(name_a, name_b) -> float:
    """
    0.0–1.0 score using difflib.SequenceMatcher.
    Handles: case, nicknames (Jim/James — small hardcoded dict),
    middle names, suffixes (Jr/Sr/III).
    No new dependencies — difflib is stdlib.
    """

────────────────────────────────────────────────
TASK 3b — agents/tools/property_tools.py
────────────────────────────────────────────────

READ-ONLY tools. ResolutionAgent calls these.

Before writing: open db/models/transaction.py (or property model) to confirm
the exact table and column names.

Functions:

def search_property_by_address(street_1, city, state, postal_code, db) -> list[dict]:
    """
    ilike search with address normalization.
    Normalize before querying:
      Street → St, Avenue → Ave, Road → Rd, Boulevard → Blvd,
      Drive → Dr, Place → Pl, Court → Ct, Lane → Ln
    Strip unit suffixes (Apt/Unit/Ste) before matching street_1.
    Returns serialized dicts.
    """

def normalize_street_address(street) -> str:
    """Exposed separately for use in resolution_service thresholds."""

def compute_address_similarity(addr_a, addr_b) -> float:
    """
    Normalize both, then score.
    Exact after normalization = 1.0.
    City or postal mismatch = 0.0 regardless of street match.
    """

────────────────────────────────────────────────
TASK 3c — agents/tools/contract_tools.py
────────────────────────────────────────────────

READ-ONLY tools. QAAgent and CoordinatorAgent call these.

Before writing: read db/models/transaction.py and related models to confirm
exact column and relationship names.

Functions:

def get_contract_by_number(contract_number, db) -> dict | None
def get_open_conditions(contract_id, db) -> list[dict]
def get_unresolved_violations(contract_id, db) -> list[dict]
def get_mortgages(contract_id, db) -> list[dict]
def get_escrow(contract_id, db) -> dict | None
def days_until_closing(contract_id, db) -> int | None
def check_commitment_received(contract_id, db) -> bool

────────────────────────────────────────────────
TASK 3d — agents/tools/task_tools.py
────────────────────────────────────────────────

WRITE tools. CoordinatorAgent calls these. Only write tools in the pipeline.

Before writing: open services/task_service.py and read it in full.
task_tools.create_task() must call task_service functions — not reimplement them.
Match the exact parameter names and types.

If task_service.create_task(contract_id, title, assignee_role, due_date, priority, db)
exists: call it directly.

If the signature differs, adapt the wrapper to match what exists.
Do not change task_service.py — only wrap it.

def create_task(contract_id, title, assignee_role, due_date, priority, db) -> dict:
    """Calls existing task_service. Returns serialized task dict."""

def open_escalation(ingestion_run_id, reason, priority, db) -> dict:
    """
    Upserts a review_queue row. Uses ON CONFLICT on ingestion_run_id.
    Does NOT call task_service — writes directly to review_queue.
    Calls audit_service.log() after write.
    """

Commit: feat: add agent tool layer (people, property, contract, task tools)
```

-----

## SECTION 4 — Agent Implementations

```
Implement all five agents. Read SECTION 2 (base types) before writing any agent.

────────────────────────────────────────────────
TASK 4a — agents/intake_agent.py
────────────────────────────────────────────────

IntakeAgent classifies the document. It does NOT write to the database.
It reads the first 2,000 chars of the PDF (pypdf extraction, same as
document_intelligence.py — reuse extract_text_from_pdf() from there).

Claude prompt — SHORT and classification-only:

  System: "You are classifying a real estate document. Return ONLY valid JSON.
           No prose. No markdown fences."

  User:   ---DOCUMENT TEXT BEGINS---
          {first_2000_chars}
          ---DOCUMENT TEXT ENDS---

          Return:
          {
            "document_type": "agreement_of_sale|rider|disclosure|
                              commitment_letter|title_report|
                              addendum|escrow_agreement|unknown",
            "processing_priority": "urgent|normal|low",
            "requires_human_review": true|false,
            "routing_notes": "one sentence",
            "linked_contract_number": "NYRCS-XXXX or null"
          }

          Priority rules:
          - urgent: closing date visible in header within 7 days,
                    OR document_type is commitment_letter or title_report
          - low: disclosure with no contingency language
          - normal: all other cases

Post-processing:
  If document_type = 'unknown': force requires_human_review = true
  Log AgentFinding(info) with classification result
  Return updated payload

The orchestrator (not this agent) decides whether to halt after intake.

────────────────────────────────────────────────
TASK 4b — agents/extraction_agent.py
────────────────────────────────────────────────

ExtractionAgent emits structured candidates — no prose.
Reuse extract_text_from_pdf() from services/document_intelligence.py.

Model: claude-sonnet-4-20250514  max_tokens: 3000

System: "You are extracting structured fields from a NY real estate Agreement
         of Sale (Form 8068). Return ONLY valid JSON. No prose. No markdown.
         For missing fields use null. ISO 8601 for all dates."

User:   ---DOCUMENT TEXT BEGINS---
        {raw_text}
        ---DOCUMENT TEXT ENDS---

        Return exactly this structure:
        {
          "candidates": [
            {"field_path": "contract.seller_name",        "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.purchaser_name",     "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "property.street_1",           "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "property.city",               "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "property.county",             "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "property.postal_code",        "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.purchase_price",     "value": 0.0,   "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.downpayment_amount", "value": 0.0,   "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.closing_date",       "value": "YYYY-MM-DD or null", "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.commitment_date",    "value": "YYYY-MM-DD or null", "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.contract_date",      "value": "YYYY-MM-DD or null", "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.acceptable_funds",   "value": "official_bank_check|certified_check|wire|cash|other", "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.subject_to_mortgage_contingency", "value": true, "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.seller_not_foreign_person",       "value": true, "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.firpta_cert_required",            "value": true, "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.as_is_sale",                      "value": true, "confidence": 0.0, "source_span": "..."},
            {"field_path": "contract.certificate_of_occupancy_required","value": true,"confidence": 0.0, "source_span": "..."},
            {"field_path": "escrow.bank_name",            "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "escrow.amount_held",          "value": 0.0,   "confidence": 0.0, "source_span": "..."},
            {"field_path": "mortgage.principal_amount",   "value": 0.0,   "confidence": 0.0, "source_span": "..."},
            {"field_path": "mortgage.interest_rate",      "value": 0.0,   "confidence": 0.0, "source_span": "..."},
            {"field_path": "mortgage.lender_name",        "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "seller_attorney.full_name",   "value": "...", "confidence": 0.0, "source_span": "..."},
            {"field_path": "purchaser_attorney.full_name","value": "...", "confidence": 0.0, "source_span": "..."}
          ]
        }

Post-processing:
  confidence < 0.5 → AgentFinding(warning) with suggested_fix
  confidence < 0.3 → AgentFinding(requires_human_review)
  Required field is null (closing_date, purchase_price, seller_name,
    purchaser_name, property.street_1) → AgentFinding(error)

────────────────────────────────────────────────
TASK 4c — agents/resolution_agent.py
────────────────────────────────────────────────

ResolutionAgent calls people_tools and property_tools.
It never writes. resolution_service applies thresholds.

For each person name in candidates (seller_name, purchaser_name,
seller_attorney.full_name, purchaser_attorney.full_name):

  1. Handle "James and Carol Park" → split into two people:
     James Park + Carol Park. Each gets its own ResolutionProposal.

  2. search_people_by_name(first, last, db)

  3. Compute match score:
     - If email extracted: search_people_by_email → 1.0 if found
     - Else: compute_name_similarity(extracted, result) as base
     - +0.05 if city matches
     - +0.10 if phone extracted and matches

  4. Select highest-scoring result

  5. Create ResolutionProposal:
     proposed_id     = result.id if score > 0 else None
     match_score     = best score
     requires_review = (AUTO_CREATE < score < AUTO_LINK)

For property: same pattern with property_tools.

Module constants (set here, used by resolution_service):
  PERSON_AUTO_LINK_THRESHOLD    = 0.92
  PERSON_AUTO_CREATE_THRESHOLD  = 0.40
  PROPERTY_AUTO_LINK_THRESHOLD  = 0.95
  PROPERTY_AUTO_CREATE_THRESHOLD = 0.50

Any proposal with requires_review → AgentFinding(requires_human_review)

────────────────────────────────────────────────
TASK 4d — agents/qa_agent.py
────────────────────────────────────────────────

IMPORTANT: Read domain/rules.py FIRST.
QAAgent must call existing rules from domain/rules.py.
It must not duplicate logic that already exists there.

For each rule in domain/rules.py that covers contract validation:
  - Call it with the extraction candidates as input
  - Map its output to an AgentFindingDTO

Then add these checks ONLY IF they do not exist in domain/rules.py:

def check_commitment_date_if_mortgage_contingency(candidates) -> AgentFindingDTO | None:
    """
    subject_to_mortgage_contingency = true AND commitment_date is null
    → AgentFinding(error, "contract.commitment_date")
    """

def check_downpayment_matches_escrow(candidates) -> AgentFindingDTO | None:
    """
    abs(downpayment_amount - escrow.amount_held) > 1.00
    → AgentFinding(error, "escrow.amount_held")
    Missing either field → AgentFinding(warning)
    """

def check_closing_date_after_contract_date(candidates) -> AgentFindingDTO | None:
    """closing_date <= contract_date → AgentFinding(error)"""

def check_commitment_date_before_closing_date(candidates) -> AgentFindingDTO | None:
    """commitment_date >= closing_date → AgentFinding(error)"""

def check_purchase_price_math(candidates) -> AgentFindingDTO | None:
    """
    downpayment + all_mortgage_principals > purchase_price * 1.05 → error
    sum < purchase_price * 0.80 → warning (unusual large cash balance)
    """

def check_firpta_representation_present(candidates) -> AgentFindingDTO | None:
    """firpta_cert_required explicitly false → warning"""

def check_seller_attorney_not_escrow_agent(candidates, db) -> AgentFindingDTO | None:
    """
    compute_name_similarity(seller_attorney.full_name, escrow.bank_name) > 0.85
    → AgentFinding(error)
    """

def check_property_address_consistency(candidates) -> AgentFindingDTO | None:
    """
    Two candidates for property.street_1 with different source_spans
    AND compute_address_similarity < 0.90 → AgentFinding(error)
    """

def check_closing_date_not_in_past(candidates) -> AgentFindingDTO | None:
    """closing_date < today → AgentFinding(warning, not error)"""

Collect all non-None findings.
auto_approvable = no 'error' and no 'requires_human_review' findings.

────────────────────────────────────────────────
TASK 4e — agents/coordinator_agent.py
────────────────────────────────────────────────

CoordinatorAgent runs AFTER commit. It uses write tools.

IMPORTANT: Read services/task_service.py before writing this agent.
All task creation goes through task_tools.create_task(),
which wraps task_service. Match parameter names exactly.

Also read services/timeline_service.py.
CoordinatorAgent does NOT dispatch generate_timeline —
that is handled by ingestion_service.commit_ingestion().
CoordinatorAgent creates operational tasks on top of the auto-generated timeline.

Task creation rules:

if mortgage contingency AND commitment not received:
  create_task("Obtain mortgage commitment letter",
              "purchaser_attorney", commitment_date - 3 days, "high")

if days_until_closing() < 14 AND commitment not received:
  create_task("Follow up: mortgage commitment deadline approaching",
              "agent", commitment_date - 1 day, "urgent")

for each open condition (get_open_conditions()):
  create_task(f"Satisfy: {condition_name}",
              "seller_attorney", closing_date - 7 days, "normal")

for each unresolved violation (get_unresolved_violations()):
  create_task(f"Resolve: {violation_type}",
              "seller_attorney", closing_date - 14 days, "high")

if days_until_closing() < 30:
  create_task("Order title search",
              "purchaser_attorney", closing_date - 21 days, "high")

always:
  create_task("Schedule closing with all parties",
              "agent", closing_date - 5 days, "normal")

if not qa_result.auto_approvable:
  open_escalation(ingestion_run_id, qa_result.block_reason, "urgent", db)

Commit: feat: implement all five agents (intake, extraction, resolution, qa, coordinator)
```

-----

## SECTION 5 — Deterministic Services

```
────────────────────────────────────────────────
TASK 5a — services/resolution_service.py
────────────────────────────────────────────────

Before writing: confirm the exact People and Property model column names
by reading db/models/user.py (or people model) and the property model.

Import thresholds from resolution_agent.py — do not hardcode them here:
  from tc.agents.resolution_agent import (
      PERSON_AUTO_LINK_THRESHOLD, PERSON_AUTO_CREATE_THRESHOLD,
      PROPERTY_AUTO_LINK_THRESHOLD, PROPERTY_AUTO_CREATE_THRESHOLD
  )

def resolve_all(resolution_result, extraction_result, ingestion_run_id, db) -> dict[str, UUID]:
    """
    For each proposal:
      score >= AUTO_LINK  → use proposed_id
      score <= AUTO_CREATE OR proposed_id is None → _create_person/_create_property
      between thresholds → open_escalation(), do not create or link

    Returns mapping: field_path → UUID
    e.g. {"contract.seller_id": <uuid>, "contract.purchaser_id": <uuid>, ...}

    Calls audit_service.log() for every create.
    Does NOT call audit_service for links (not a new record).
    """

def _create_person(candidates_dict, db) -> UUID:
    """
    Creates people row. Required: first_name, last_name.
    Uses sentinel email: agent.created.{run_id[:8]}@pending.estora.app
    so agent-created rows are identifiable for cleanup.
    state defaults to 'NY'. masked_tax_id = null.
    Calls audit_service.log(action='agent_created_person').
    Returns new people.id.
    """

def _create_property(candidates_dict, db) -> UUID:
    """
    Creates properties row. Required: street_1, city.
    state = 'NY'. legal_description = 'Pending Schedule A — extracted by agent'.
    as_is_sale = True. has_public_road_access = True.
    Calls audit_service.log(action='agent_created_property').
    Returns new properties.id.
    """

────────────────────────────────────────────────
TASK 5b — services/ingestion_service.py
────────────────────────────────────────────────

The ONLY path by which contracts rows are created during the agent pipeline.
Called by orchestrator ONLY when all five conditions are met:
  1. All agents completed without AgentError
  2. qa_result.auto_approvable = True
  3. resolve_all() returned a complete ID mapping
  4. No entity required_review in resolution_result
  5. Orchestrator confirmed — not called directly by any agent

def commit_ingestion(payload, resolved_ids, db) -> UUID:
    """
    Steps — all in a single db.commit():

    1. Idempotency: check contracts.contract_number collision.
       If exists, return existing id (do not raise — idempotent).

    2. Write contracts row using resolved_ids for seller_id, purchaser_id,
       seller_attorney_id, purchaser_attorney_id, property_id.
       source_document_id = payload.document_id.

    3. Write contract_mortgages rows from mortgage candidates.

    4. Write contract_escrow row from escrow candidates.

    5. Write contract_closing_conditions rows — standard NY Form 8068 set.
       (Same 12 conditions as in seed.sql — is_satisfied = false.)

    6. Write contract_permitted_exceptions rows — standard 5 exceptions.

    7. Write contract_personal_property rows — standard 12 items.

    8. Write contract_apportionments row.
       Set prorate_rents = True if property_type = 'multi_family'.

    9. Update ingestion_runs: status='complete', completed_at=now(),
       coordinator_result=payload.coordinator_result as JSON.

    10. Store all agent_findings from payload.all_findings.
        Call qa_service.store_findings(payload.all_findings, run_id, db).

    11. Call audit_service.log(action='contract_ingested_from_agent',
                               entity_id=contract.id).

    12. db.commit() — single atomic commit for all of the above.

    AFTER commit (outside the transaction):
    13. Dispatch: generate_timeline.delay(str(contract_id))
        Import from workers.celery_tasks (check the renamed file from TASKS.md).

    14. Call: health_service.compute_health_score(contract_id=contract_id, db=db)
        Read health_service.py first to confirm the exact function signature.

    Returns: contract.id (UUID)
    """

────────────────────────────────────────────────
TASK 5c — services/qa_service.py
────────────────────────────────────────────────

def store_findings(findings, ingestion_run_id, db) -> list[UUID]:
    """
    Writes AgentFindingDTO objects to agent_findings table.
    Written even for auto-approvable runs — they form the audit trail.
    Returns list of inserted IDs.
    """

def get_findings_summary(ingestion_run_id, db) -> dict:
    """
    Returns:
    {
      "error_count":             int,
      "warning_count":           int,
      "requires_review_count":   int,
      "info_count":              int,
      "auto_approvable":         bool,
      "highest_severity_finding": dict | None
    }
    """

Commit: feat: add resolution_service, ingestion_service, qa_service
```

-----

## SECTION 6 — Orchestrator

```
Create apps/api/src/tc/agents/orchestrator.py

Read event_log_service.py before writing _update_run_status().
Every status transition must call event_log_service.log_event().

def run_ingestion_pipeline(document_id, pdf_bytes, ingestion_run_id, db) -> dict:
    """
    Entry point. Called by POST /ingestion/upload or Celery task wrapper.

    Returns:
    {
      "ingestion_run_id": str,
      "status":           "complete|needs_review|failed",
      "contract_id":      str | None,
      "findings_summary": dict,
      "review_queue_id":  str | None
    }
    """

    payload = HandoffPayload(ingestion_run_id, document_id, pdf_bytes)
    _update_run_status(ingestion_run_id, "intake", db)

    # Step 1: Intake
    try:
        payload = IntakeAgent().run(payload, db)
    except AgentError as e:
        return _fail(ingestion_run_id, str(e), db)

    # Short-circuit: unknown document type
    if payload.intake_result.requires_human_review \
            and payload.intake_result.document_type == "unknown":
        store_findings(payload.all_findings, ingestion_run_id, db)
        _update_run_status(ingestion_run_id, "needs_review", db)
        rq = open_escalation(ingestion_run_id, "Unknown document type", "normal", db)
        return _result(ingestion_run_id, "needs_review", None, payload, rq["id"])

    # Step 2: Extraction
    _update_run_status(ingestion_run_id, "extracting", db)
    try:
        payload = ExtractionAgent().run(payload, db)
    except AgentError as e:
        return _fail(ingestion_run_id, str(e), db)

    # Step 3: Resolution
    _update_run_status(ingestion_run_id, "resolving", db)
    try:
        payload = ResolutionAgent().run(payload, db)
    except AgentError as e:
        return _fail(ingestion_run_id, str(e), db)

    try:
        resolved_ids = resolve_all(
            payload.resolution_result, payload.extraction_result,
            ingestion_run_id, db
        )
    except Exception as e:
        return _fail(ingestion_run_id, f"Resolution failed: {e}", db)

    # If any entity needs review, pause
    if any(p.requires_review for p in payload.resolution_result.proposals):
        store_findings(payload.all_findings, ingestion_run_id, db)
        _update_run_status(ingestion_run_id, "needs_review", db)
        rq = open_escalation(ingestion_run_id, "Entity resolution needs review", "normal", db)
        return _result(ingestion_run_id, "needs_review", None, payload, rq["id"])

    # Step 4: QA
    _update_run_status(ingestion_run_id, "qa", db)
    try:
        payload = QAAgent().run(payload, db)
    except AgentError as e:
        return _fail(ingestion_run_id, str(e), db)

    store_findings(payload.all_findings, ingestion_run_id, db)
    summary = get_findings_summary(ingestion_run_id, db)

    if not payload.qa_result.auto_approvable:
        _update_run_status(ingestion_run_id, "needs_review", db)
        rq = open_escalation(ingestion_run_id, payload.qa_result.block_reason, "urgent", db)
        return _result(ingestion_run_id, "needs_review", None, payload, rq["id"])

    # Step 5: Commit (via ingestion_service — not by orchestrator directly)
    try:
        contract_id = commit_ingestion(payload, resolved_ids, db)
    except Exception as e:
        return _fail(ingestion_run_id, f"Commit failed: {e}", db)

    # Step 6: Coordinator (failure here does not fail the ingestion)
    _update_run_status(ingestion_run_id, "coordinating", db)
    try:
        payload = CoordinatorAgent().run(payload, db)
    except AgentError:
        pass  # Contract is committed; coordinator failure is non-fatal

    _update_run_status(ingestion_run_id, "complete", db)
    return _result(ingestion_run_id, "complete", contract_id, payload, None)


def _update_run_status(run_id, status, db):
    """
    Updates ingestion_runs.status.
    ALSO calls event_log_service.log_event() — read that file first
    to use the exact function signature.
    """

def _fail(run_id, error_message, db) -> dict:
    """Marks run failed, returns failure result."""

def _result(run_id, status, contract_id, payload, review_queue_id) -> dict:
    """Builds return dict."""

Commit: feat: add orchestrator with five-agent pipeline and event_log integration
```

-----

## SECTION 7 — Celery Task Wrapper

```
Add to apps/api/src/tc/workers/celery_tasks.py (the renamed file from TASKS.md).

@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    name="tc.workers.celery_tasks.run_ingestion_pipeline_async"
)
def run_ingestion_pipeline_async(self, document_id_str, pdf_bytes_b64, ingestion_run_id_str):
    """
    Celery wrapper for the ingestion orchestrator.
    base64-encodes PDF bytes because Celery serializes to JSON.

    Retries on transient errors (network, DB connection).
    Does NOT retry on AgentError — deterministic failures.
    """
    import base64
    from uuid import UUID
    from tc.agents.orchestrator import run_ingestion_pipeline
    from tc.db.session import SessionLocal
    from tc.agents.base import AgentError

    db = SessionLocal()
    try:
        pdf_bytes = base64.b64decode(pdf_bytes_b64)
        return run_ingestion_pipeline(
            document_id=UUID(document_id_str),
            pdf_bytes=pdf_bytes,
            ingestion_run_id=UUID(ingestion_run_id_str),
            db=db,
        )
    except AgentError:
        raise  # deterministic failure — do not retry
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        db.close()

Commit: feat: add Celery async wrapper for ingestion pipeline
```

-----

## SECTION 8 — Veris Sandbox Setup

This section sets up the Veris simulation environment.
The sandbox runs the same five agents against a Veris-managed Postgres instance
seeded with synthetic NY contract data, without touching production Supabase.

```
────────────────────────────────────────────────
TASK 8a — Install Veris CLI
────────────────────────────────────────────────

pip install veris-cli
# or, since the project uses uv:
uv tool install veris-cli

veris login
# Opens browser for auth. For CI: veris login YOUR_API_KEY

Verify:
veris --version

────────────────────────────────────────────────
TASK 8b — Create the Veris environment
────────────────────────────────────────────────

From the repo root:

cd apps/api
veris env create --name "estora-ingestion-agent"

This creates .veris/ with:
  .veris/veris.yaml         ← edit next (Task 8c)
  .veris/Dockerfile.sandbox ← edit next (Task 8d)
  .veris/.dockerignore

The environment is registered on the Veris platform with an ID.
Note the environment ID from the output — you'll need it for CI.

────────────────────────────────────────────────
TASK 8c — Create .veris/veris.yaml
────────────────────────────────────────────────

Create apps/api/.veris/veris.yaml with exactly this content:

version: "1.0"

services:
  # Real PostgreSQL — Veris seeds it with scenario data before each run.
  # Our agent schema is applied first, then scenario-specific INSERTs.
  # This replaces production Supabase in simulation.
  - name: postgres

actor:
  # The simulated actor is an attorney or agent submitting a contract.
  # It communicates with our ingestion endpoint over HTTP.
  init:
    type: http
    method: POST
    url: http://localhost:8000/api/v1/auth/dev-token
    body:
      email: "sim.attorney@veris.estora.app"
    response:
      message_field: access_token
  channels:
    - type: http
      url: http://localhost:8000/api/v1/ingestion/upload
      method: POST
      headers:
        Authorization: Bearer {access_token}
      request:
        # Actor "sends" the contract text as a message field.
        # Our endpoint adapter converts this to a PDF for the pipeline.
        message_field: contract_text
        static_fields:
          simulation_mode: "true"
      response:
        type: json
        message_field: status
  config:
    RESPONSE_INTERVAL: "3"

agent:
  code_path: /agent
  entry_point: >
    uv run --no-sync uvicorn tc.main:app
    --host 0.0.0.0 --port 8000
  port: 8000
  environment:
    # Veris injects DATABASE_URL pointing to the sandbox Postgres automatically.
    # We only need to declare non-DB variables.
    ENVIRONMENT: development
    REDIS_URL: redis://localhost:6379/0
    JWT_SECRET: veris-sim-secret-not-production
    JWT_ALGORITHM: HS256
    ACCESS_TOKEN_EXPIRE_MINUTES: "480"
    # ANTHROPIC_API_KEY is set via veris env vars set (never in veris.yaml)
    # LLM calls go through the Veris LLM proxy for tracing

Notes on this config:
- DATABASE_URL is injected by Veris automatically for the postgres service.
  The format is: postgresql://postgres:postgres@localhost:5432/SIMULATION_ID
  Do not set DATABASE_URL in agent.environment — Veris handles it.
- ANTHROPIC_API_KEY must be set separately (Task 8e).
- simulation_mode: "true" is a static field that tells our endpoint adapter
  to accept text input and convert it to a minimal PDF for the pipeline.
  Add this adapter to api/v1/ingestion.py (Task 9).

────────────────────────────────────────────────
TASK 8d — Create .veris/Dockerfile.sandbox
────────────────────────────────────────────────

Create apps/api/.veris/Dockerfile.sandbox with exactly this content:

ARG GVISOR_BASE
FROM ${GVISOR_BASE}

# Install agent dependencies using uv (matches the project's package manager)
COPY pyproject.toml uv.lock /agent/
WORKDIR /agent
RUN uv sync --frozen --no-dev

# Copy agent source code
COPY src /agent/src

# Copy the agent schema so Veris applies it to sandbox Postgres before seeding.
# Veris looks for schema files in /agent/schemas/ and applies them at startup.
COPY schemas /agent/schemas

# Always end with WORKDIR /app — Veris entrypoint expects this.
WORKDIR /app

The schemas/ directory must contain our agent tables migration as plain SQL.
Create apps/api/schemas/agent_schema.sql (Task 8f).

────────────────────────────────────────────────
TASK 8e — Set environment secrets
────────────────────────────────────────────────

cd apps/api
veris env vars set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx --secret

# Verify the variable is registered (value will be masked):
veris env vars list

Never put the API key in veris.yaml or Dockerfile.sandbox.

────────────────────────────────────────────────
TASK 8f — Create apps/api/schemas/agent_schema.sql
────────────────────────────────────────────────

This file is the full schema applied to the Veris sandbox Postgres before
each simulation. It combines the Supabase production schema (from seed.sql)
with the new agent tables migration.

The file must be plain SQL with no BEGIN/COMMIT wrappers — Veris applies it
transactionally. No seed data (Veris generates that from the scenario brief).

Steps:
1. Extract all CREATE TABLE, CREATE INDEX, CREATE TRIGGER,
   and CREATE FUNCTION statements from seed.sql (schema only, no INSERTs).
2. Append the CREATE TABLE statements for ingestion_runs, agent_findings,
   review_queue from the migration written in Section 1.
3. Save to apps/api/schemas/agent_schema.sql

Verify the file is valid SQL:
  psql $DATABASE_URL -f apps/api/schemas/agent_schema.sql
  # Should execute with no errors on a clean database.

────────────────────────────────────────────────
TASK 8g — Push the agent image
────────────────────────────────────────────────

cd apps/api
veris env push

This builds the Dockerfile.sandbox, tags it as 'latest',
and pushes it to the Veris registry.

After push:
veris env list
# Should show 'estora-ingestion-agent' with 1 image tag.

Push with a named tag for the first stable version:
veris env push --tag v0.1.0-sandbox

Commit: feat: add Veris sandbox config (.veris/veris.yaml, Dockerfile.sandbox, schemas/)
```

-----

## SECTION 9 — Simulation Mode Adapter

```
The Veris actor sends contract text as a JSON field over HTTP.
Our production endpoint expects a PDF binary via multipart/form-data.
Add a simulation mode adapter to api/v1/ingestion.py.

In POST /ingestion/upload, add a simulation mode branch:

if request.headers.get("X-Simulation-Mode") == "true" \
        or form.get("simulation_mode") == "true":
    # Veris actor sends contract text, not a PDF.
    # Convert to a minimal PDF wrapper for the pipeline.
    contract_text = form.get("contract_text", "")
    if not contract_text:
        raise HTTPException(400, "simulation_mode requires contract_text field")
    pdf_bytes = _text_to_minimal_pdf(contract_text)
else:
    # Production path: real PDF upload
    file = form.get("file")
    pdf_bytes = await file.read()

def _text_to_minimal_pdf(text: str) -> bytes:
    """
    Wraps plain text in a minimal valid PDF structure.
    Used only in simulation mode so the extraction pipeline
    can run against synthetic contract text from Veris scenarios.
    The PDF starts with %PDF- so magic byte validation passes.
    """
    header = b"%PDF-1.4\n"
    body = f"1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    body += f"2 0 obj\n<< /Type /Page /MediaBox [0 0 612 792] "
    body += f"/Contents 3 0 R >>\nendobj\n"
    body += f"3 0 obj\n<< /Length {len(text)} >>\nstream\n"
    body += text
    body += "\nendstream\nendobj\n"
    body += "xref\n0 4\ntrailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n9\n%%EOF\n"
    return header + body.encode("utf-8")

This adapter is ONLY active when simulation_mode is set.
Production requests never hit this branch.

Commit: feat: add simulation mode adapter for Veris actor text input
```

-----

## SECTION 10 — Veris Scenarios

```
Create the 10 scenario YAML files in veris/scenarios/.
Each follows the Veris ScenarioContent schema exactly.
Read the Veris scenario schema at docs.veris.ai/concepts/scenarios before writing.

Key rules for scenario YAML:
- actors: define persona, role, objectives
- briefs.postgres: seed instructions for Veris to populate sandbox Postgres
- assertions: path-agnostic boolean outcomes — not step-by-step scripts
- initial_turn: the opening message the actor sends to our agent

────────────────────────────────────────────────
scenario_01_name_variant.yaml
────────────────────────────────────────────────

scenario_id: name_variant_same_buyer
title: Buyer Name Variant Across Documents

description: >
  Tests whether ResolutionAgent correctly flags a nickname variant of an existing
  buyer rather than silently creating a duplicate people record.

actors:
  - name: Patricia Okafor
    type: persona
    role: >
      A real estate attorney at a midsize Manhattan firm submitting a purchase
      contract on behalf of her client. Professional and precise. Expects
      the system to handle routine transactions without errors.
    objectives:
      - objective: Submit a contract for buyer "Jim Park" successfully
      - objective: Have the system recognize Jim Park as an existing record (James Park)
    knowledge: >
      Knows the property address and purchase price. Does not know the system's
      internal buyer ID or that "James Park" is already in the database.

environment:
  description: >
    An existing people record for "James Park" was created during a prior
    contract submission for the same buyer.

initial_turn:
  actor: Patricia Okafor
  action: >
    I'm submitting a new Agreement of Sale for 300 E 74th St, Manhattan.
    Buyer is Jim Park, seller is Margaret Wu. Purchase price $650,000,
    closing March 28, 2026. Mortgage contingency with commitment date March 10.
    Downpayment $65,000, escrow at JPMorgan Chase.

briefs:
  postgres: >
    Insert a people record: first_name='James', last_name='Park',
    email='james.park99@example.com', city='Manhattan', state='NY',
    masked_tax_id='XXX-XX-1099'. This represents the existing buyer record
    that the name variant "Jim Park" should match against.

assertions:
  - ResolutionAgent generated a requires_human_review finding for buyer name
  - No duplicate people record was auto-created for "Jim Park"
  - Ingestion run status is needs_review, not complete

────────────────────────────────────────────────
scenario_02_address_rider_mismatch.yaml
────────────────────────────────────────────────

scenario_id: address_rider_mismatch
title: Property Address Differs Between Contract Body and Rider

description: >
  Tests detection of an address inconsistency where the main contract
  header and an attached rider reference different unit designations
  for the same property.

actors:
  - name: David Reyes
    type: persona
    role: >
      A purchaser's attorney submitting a contract package that includes
      both the main AOS and a rider. He does not notice the address inconsistency.
    objectives:
      - objective: Submit the contract package without manual review
    knowledge: >
      Knows the property address from the main contract. Unaware the rider
      has a different unit designation.

initial_turn:
  actor: David Reyes
  action: >
    Submitting AOS for 112 W 87th Street, Manhattan NY 10024.
    Buyer Sarah Chen, Seller Robert Kim. Price $875,000.
    The rider attached references 112 W 87th St, Apt 4A.
    Closing April 15, 2026. Commitment date March 20.

assertions:
  - QAAgent generated an error finding for property address inconsistency
  - Finding field_path is property.street_1
  - Ingestion run is routed to needs_review

────────────────────────────────────────────────
scenario_03_price_inconsistency.yaml
────────────────────────────────────────────────

scenario_id: purchase_price_math_error
title: Purchase Price Breakdown Does Not Sum to Total

description: >
  Tests detection of inconsistent financial figures where downpayment plus
  mortgage principal does not equal the stated purchase price.

actors:
  - name: Elena Vasquez
    type: persona
    role: >
      A title company representative reviewing the contract before submission.
      She is detail-oriented but missed a transposition error in the price breakdown.
    objectives:
      - objective: Submit the contract for processing
    knowledge: >
      Knows the stated purchase price. Does not know there is an arithmetic error.

initial_turn:
  actor: Elena Vasquez
  action: >
    Contract for 245 Dean St, Brooklyn. Seller James Okonkwo, buyer Priya Patel.
    Purchase price $520,000. Downpayment $52,000. Mortgage $432,000.
    Balance at closing listed as $62,000. Closing May 1, 2026.
    Commitment date April 5. Escrow at M&T Bank, $52,000 held.

assertions:
  - QAAgent generated an error finding for purchase price math inconsistency
  - Finding field_path is contract.purchase_price or contract.balance_due_at_closing
  - Ingestion run is routed to needs_review

────────────────────────────────────────────────
scenario_04_missing_commitment_date.yaml
────────────────────────────────────────────────

scenario_id: missing_commitment_date
title: Mortgage Contingency Without Commitment Date

description: >
  Tests that a mortgage contingency clause without a corresponding commitment
  date triggers an error finding and blocks auto-approval.

actors:
  - name: Marcus Webb
    type: persona
    role: >
      A solo real estate agent who prepared the contract himself.
      He included mortgage contingency language but forgot to fill in
      the commitment date field.
    objectives:
      - objective: Submit the contract without revisiting it
    knowledge: >
      Knows the property and parties. Does not realize the commitment date is blank.

initial_turn:
  actor: Marcus Webb
  action: >
    Agreement of Sale for 66-11 Yellowstone Blvd, Queens. Buyer Ava Thompson,
    seller Noah Rivera. Price $398,000. Mortgage contingency is yes.
    No commitment date specified. Closing April 20, 2026. Downpayment $39,800.
    Escrow at Citibank $39,800.

assertions:
  - QAAgent generated an error finding for missing commitment date
  - Finding field_path is contract.commitment_date
  - Ingestion status is needs_review

────────────────────────────────────────────────
scenario_05_escrow_downpayment_mismatch.yaml
────────────────────────────────────────────────

scenario_id: escrow_downpayment_mismatch
title: Downpayment Does Not Match Escrow Amount

description: >
  Tests detection of a discrepancy between the stated downpayment and
  the amount being held in escrow.

actors:
  - name: Sandra Bloom
    type: persona
    role: >
      A seller's attorney. The escrow agreement was amended but the
      contract body was not updated to reflect the new amount.
    objectives:
      - objective: Submit the contract as-is
    knowledge: >
      Knows both figures. Believes the escrow amendment supersedes the contract.

initial_turn:
  actor: Sandra Bloom
  action: >
    Submitting AOS for 815 Grand Concourse, Bronx. Seller Michael Torres,
    buyer Olivia Kim. Price $285,000. Downpayment in contract is $28,500.
    Escrow amount at JPMorgan is $25,000 per the escrow agreement.
    Closing March 30, 2026.

assertions:
  - QAAgent generated an error finding for escrow and downpayment mismatch
  - Finding includes the dollar difference
  - Ingestion status is needs_review

────────────────────────────────────────────────
scenario_06_firpta_missing.yaml
────────────────────────────────────────────────

scenario_id: firpta_representation_absent
title: FIRPTA Certification Not Present in Contract

description: >
  Tests that an absent or contradictory FIRPTA representation triggers
  a warning finding requiring attorney review.

actors:
  - name: Camille Nguyen
    type: persona
    role: >
      A purchaser's attorney. The seller is a foreign national and the
      standard FIRPTA certification language was omitted from the contract.
    objectives:
      - objective: Submit the contract and escalate FIRPTA separately
    knowledge: >
      Knows the seller is a foreign person. Expects the system to catch this.

initial_turn:
  actor: Camille Nguyen
  action: >
    Contract for 29 Stuyvesant Pl, Staten Island. Seller Yuki Tanaka
    (foreign person — Japanese national), buyer Benjamin Harris.
    Price $467,000. Closing April 10, 2026. FIRPTA not included in
    this draft — seller attorney will provide separately.

assertions:
  - QAAgent generated a warning finding for FIRPTA representation
  - Finding field_path is contract.firpta_cert_required
  - Finding suggested_fix references 26 U.S.C. 1445

────────────────────────────────────────────────
scenario_07_attorney_escrow_conflict.yaml
────────────────────────────────────────────────

scenario_id: attorney_escrow_conflict
title: Seller Attorney and Escrow Agent Are the Same Party

description: >
  Tests detection of an ethical conflict where the same attorney is
  listed as both seller's counsel and escrow holder.

actors:
  - name: Howard Stern
    type: persona
    role: >
      A solo practitioner who routinely acts as both counsel and escrow
      agent for small transactions. He does not see this as a conflict.
    objectives:
      - objective: Submit the contract with himself as both attorney and escrow agent
    knowledge: >
      Knows he is acting in both roles. Does not know the system will flag it.

initial_turn:
  actor: Howard Stern
  action: >
    AOS for 10 Lake St, White Plains. Seller Carl Davis, buyer Emma Johnson.
    Price $340,000. Seller attorney: Howard Stern, Esq., Law Office of Howard Stern.
    Escrow holder: Law Office of Howard Stern, $34,000. Closing May 15, 2026.

assertions:
  - QAAgent generated an error finding for attorney-escrow conflict
  - Finding references NY ethical rules
  - Ingestion status is needs_review

────────────────────────────────────────────────
scenario_08_addendum_overrides_close_date.yaml
────────────────────────────────────────────────

scenario_id: addendum_close_date_extension
title: Addendum Extends Closing Date on Existing Contract

description: >
  Tests that IntakeAgent correctly classifies a document as an addendum,
  links it to an existing contract, and that the pipeline does not
  create a duplicate contract record.

actors:
  - name: Rachel Kim
    type: persona
    role: >
      A transaction coordinator submitting a closing date extension addendum
      for an already-active contract.
    objectives:
      - objective: Have the addendum linked to the correct existing contract
      - objective: Have the closing date updated on the existing contract record
    knowledge: >
      Knows the original contract number NYRCS-0001. Knows the new closing date.

environment:
  description: >
    Contract NYRCS-0001 exists in the database with closing_date 2026-03-28.

briefs:
  postgres: >
    Ensure a contracts row with contract_number='NYRCS-0001' exists,
    with closing_date='2026-03-28' and status='active'.

initial_turn:
  actor: Rachel Kim
  action: >
    Submitting a closing date extension addendum for contract NYRCS-0001,
    112 W 87th St Manhattan. New closing date is April 15, 2026.
    All other terms remain unchanged.

assertions:
  - IntakeAgent classified document_type as addendum
  - IntakeAgent linked_contract_number is NYRCS-0001
  - No new contract row was created
  - Ingestion run status is complete

────────────────────────────────────────────────
scenario_09_ocr_corruption.yaml
────────────────────────────────────────────────

scenario_id: ocr_date_and_price_corruption
title: OCR Corruption in Dates and Purchase Price

description: >
  Tests that ExtractionAgent detects OCR errors in critical fields,
  assigns low confidence, and routes to review rather than auto-committing.

actors:
  - name: James Okafor
    type: persona
    role: >
      An agent submitting a scanned contract where the OCR produced
      garbled characters in the date and price fields.
    objectives:
      - objective: Submit the contract despite scan quality issues
    knowledge: >
      Knows the actual values. The garbled text is a scan artifact.

initial_turn:
  actor: James Okafor
  action: >
    Scanned AOS for 55 Dove St, Albany. Buyer Grace Martinez,
    seller Lucas Chen. Purchase price $425,0O0 (note: capital O not zero).
    Closing date March 2B 2026. Commitment date March 1O 2026.
    Downpayment $42500. Escrow at Wells Fargo.

assertions:
  - ExtractionAgent generated requires_human_review findings for corrupted fields
  - Confidence for closing_date and purchase_price is below 0.4
  - Ingestion status is needs_review

────────────────────────────────────────────────
scenario_10_duplicate_property_second_contract.yaml
────────────────────────────────────────────────

scenario_id: duplicate_property_second_contract
title: Second Active Contract Submitted for Same Property

description: >
  Tests that submitting a second contract for a property that already has
  an active contract triggers a warning finding without blocking ingestion.

actors:
  - name: Natalie Ponce
    type: persona
    role: >
      A listing agent submitting a backup offer contract for a property
      that already has an accepted offer. She knows there is an existing
      contract and expects a warning.
    objectives:
      - objective: Submit the backup contract successfully
      - objective: Receive a warning that an active contract exists
    knowledge: >
      Knows there is an existing active contract for this property.

briefs:
  postgres: >
    Ensure a contracts row exists for property at '112 W 87th St, Manhattan'
    with status='active'. This represents the original accepted offer.

initial_turn:
  actor: Natalie Ponce
  action: >
    Backup offer AOS for 112 W 87th St, Manhattan. New buyer Carol Zhang,
    seller same as existing contract James Park. Price $910,000.
    Closing April 30, 2026. This is a backup offer per seller's instruction.

assertions:
  - ResolutionAgent auto-linked to existing property record
  - CoordinatorAgent or QAAgent generated a warning about existing active contract
  - Ingestion status is complete (backup contracts are allowed)
  - No duplicate property row was created

Commit: feat: add 10 Veris simulation scenarios for NY contract ingestion
```

-----

## SECTION 11 — Veris Graders

```
Create veris/graders/ingestion_grader.py

Graders evaluate simulation transcripts. They are Python functions
that return a score 0.0–1.0. Read docs.veris.ai/concepts/scenarios
for the exact Python evaluator interface before writing.

def grade(trace):
    """
    trace is a list of dicts from the simulation transcript.
    Each dict has: type, content, timestamp, and optionally tool_call data.

    Returns 1.0 if all of:
    - The ingestion endpoint was called (tool_call type = http_request)
    - A status was returned in the response
    - The response status is one of: complete, needs_review, failed
      (i.e. the pipeline completed without an unhandled exception)

    Returns 0.0 if:
    - The endpoint was never called
    - The response had an HTTP 5xx status
    - The response body is missing the 'status' field
    """
    http_calls = [e for e in trace if e.get("type") == "tool_call"
                  and "ingestion/upload" in str(e.get("content", ""))]

    if not http_calls:
        return 0.0

    last_call = http_calls[-1]
    response = last_call.get("response", {})

    if response.get("status_code", 0) >= 500:
        return 0.0

    body = response.get("body", {})
    if not isinstance(body, dict):
        return 0.0

    if body.get("status") not in ("complete", "needs_review", "failed"):
        return 0.0

    return 1.0


Create veris/graders/qa_grader.py

def grade(trace):
    """
    Checks that error-scenario simulations produce findings.
    
    Returns 1.0 if the response body contains findings_summary with
    at least one error or requires_human_review count > 0 when the
    scenario is expected to have errors (inferred from actor initial_turn
    containing known trigger phrases like "no commitment date", "OCR",
    "same attorney").

    Returns 0.5 if the pipeline ran but findings_summary is empty
    (possible false negative — partial credit).

    Returns 0.0 if the pipeline returned complete without any findings
    and trigger phrases were present.
    """
    ERROR_TRIGGERS = [
        "no commitment date", "no commitment", "firpta not included",
        "same attorney", "capital O not zero", "march 2B", "backup offer"
    ]

    # Find the initial actor message
    actor_msgs = [e for e in trace if e.get("role") == "actor"]
    if not actor_msgs:
        return 0.5  # can't evaluate without actor context

    first_msg = actor_msgs[0].get("content", "").lower()
    expects_findings = any(t in first_msg for t in ERROR_TRIGGERS)

    # Find the ingestion response
    http_responses = [
        e.get("response", {}).get("body", {})
        for e in trace
        if e.get("type") == "tool_call"
        and "ingestion/upload" in str(e.get("content", ""))
    ]

    if not http_responses:
        return 0.0

    last_response = http_responses[-1]
    summary = last_response.get("findings_summary", {})

    error_count = summary.get("error_count", 0)
    review_count = summary.get("requires_review_count", 0)

    if expects_findings and (error_count + review_count) == 0:
        return 0.0  # should have found errors, didn't

    if expects_findings and (error_count + review_count) > 0:
        return 1.0  # found errors as expected

    return 0.5  # no triggers, neutral

Commit: feat: add Veris graders (pipeline completion + QA finding coverage)
```

-----

## SECTION 12 — Generate Scenarios and Run First Simulation

```
With the agent pushed and scenarios written, run the full Veris loop.

────────────────────────────────────────────────
Step 1: Generate scenarios from agent code
────────────────────────────────────────────────

cd apps/api
veris scenarios create

This sends our agent code to Veris, which analyzes it and generates
additional test scenarios on top of our hand-written ones.

Watch generation progress:
veris scenarios status <SET_ID> --watch

────────────────────────────────────────────────
Step 2: Run simulations
────────────────────────────────────────────────

# Interactive mode — select scenarios, run, evaluate, report
veris run

# Or run each step individually:

# Run all 10 hand-written scenarios
veris simulations create \
  --scenario-set-id <SET_ID> \
  --simulation-timeout 300

# Watch progress
veris simulations status <RUN_ID> --watch --log

────────────────────────────────────────────────
Step 3: Evaluate
────────────────────────────────────────────────

veris evaluations create --run-id <RUN_ID>
veris evaluations status <EVAL_ID> --watch

────────────────────────────────────────────────
Step 4: Generate report
────────────────────────────────────────────────

veris reports create --evaluation-id <EVAL_ID>

The report provides root cause analysis and actionable recommendations.
For each failed scenario, the report identifies which agent produced the
incorrect behavior and suggests specific code fixes.

────────────────────────────────────────────────
Expected outcomes for first run
────────────────────────────────────────────────

Scenario 01 (name variant):       needs_review  ✓
Scenario 02 (address mismatch):   needs_review  ✓
Scenario 03 (price math):         needs_review  ✓
Scenario 04 (missing commit date):needs_review  ✓
Scenario 05 (escrow mismatch):    needs_review  ✓
Scenario 06 (FIRPTA):             needs_review  ✓
Scenario 07 (attorney/escrow):    needs_review  ✓
Scenario 08 (addendum):           complete      ✓
Scenario 09 (OCR):                needs_review  ✓
Scenario 10 (backup contract):    complete      ✓

If any scenario produces "complete" when "needs_review" is expected,
or "failed" for any scenario, read the Veris report for the root cause.

Commit: feat: push agent to Veris, generate scenarios, record baseline simulation results
```

-----

## SECTION 13 — CI/CD Integration

```
Create .github/workflows/veris-simulation.yml

This workflow runs the Veris simulation suite on every push to slopathon
and on every PR. It blocks merge if any scenario regression is detected.

name: Veris Agent Simulation

on:
  push:
    branches: [slopathon]
    paths:
      - 'apps/api/src/tc/agents/**'
      - 'apps/api/src/tc/services/ingestion_service.py'
      - 'apps/api/src/tc/services/resolution_service.py'
      - 'apps/api/src/tc/services/qa_service.py'
  pull_request:
    branches: [slopathon]

jobs:
  simulate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Veris CLI
        run: pip install veris-cli

      - name: Authenticate Veris
        run: veris login ${{ secrets.VERIS_API_KEY }}
        working-directory: apps/api

      - name: Push agent image
        run: veris env push --tag ci-${{ github.sha }}
        working-directory: apps/api

      - name: Run simulations
        run: |
          veris simulations create \
            --scenario-set-id ${{ vars.VERIS_SCENARIO_SET_ID }} \
            --image-tag ci-${{ github.sha }} \
            --simulation-timeout 300
        working-directory: apps/api

      - name: Wait for results
        run: veris simulations status $RUN_ID --watch
        working-directory: apps/api

      - name: Evaluate
        run: veris evaluations create --run-id $RUN_ID
        working-directory: apps/api

      - name: Quality gate — fail if regression
        run: |
          SCORE=$(veris evaluations get $EVAL_ID --format json | \
                  python3 -c "import sys,json; print(json.load(sys.stdin)['score'])")
          echo "Simulation score: $SCORE"
          python3 -c "
          score = float('$SCORE')
          if score < 0.80:
              print(f'FAIL: Score {score:.2f} is below threshold 0.80')
              exit(1)
          print(f'PASS: Score {score:.2f}')
          "
        working-directory: apps/api

Required GitHub secrets:
  VERIS_API_KEY        — get from Veris console
  ANTHROPIC_API_KEY    — already set in repo secrets from TASKS.md

Required GitHub variables:
  VERIS_SCENARIO_SET_ID — the scenario set ID from veris scenarios create
                          update this after regenerating scenarios

Commit: feat: add Veris CI/CD workflow with 0.80 quality gate
```

-----

## Final Verification Checklist

```bash
# ── Agent imports ────────────────────────────────────────────────
cd apps/api
uv run python -c "
from tc.agents.intake_agent      import IntakeAgent
from tc.agents.extraction_agent  import ExtractionAgent
from tc.agents.resolution_agent  import ResolutionAgent
from tc.agents.qa_agent          import QAAgent
from tc.agents.coordinator_agent import CoordinatorAgent
from tc.agents.orchestrator      import run_ingestion_pipeline
print('Agent imports OK')
"

# ── Service imports ──────────────────────────────────────────────
uv run python -c "
from tc.services.ingestion_service  import commit_ingestion
from tc.services.resolution_service import resolve_all
from tc.services.qa_service         import store_findings, get_findings_summary
print('Service imports OK')
"

# ── Repo service wiring (must NOT raise ImportError) ─────────────
uv run python -c "
from tc.services.task_service      import create_task
from tc.services.health_service    import compute_health_score
from tc.services.timeline_service  import generate_timeline
from tc.services.audit_service     import log
from tc.services.event_log_service import log_event
print('Existing service wiring OK')
"

# ── Rules not duplicated ─────────────────────────────────────────
# Grep for any function in qa_agent.py that duplicates a function name in rules.py
python3 -c "
import re, pathlib
rules  = set(re.findall(r'^def (\w+)', pathlib.Path('src/tc/domain/rules.py').read_text(), re.M))
qa     = set(re.findall(r'^def (\w+)', pathlib.Path('src/tc/agents/qa_agent.py').read_text(), re.M))
dupes  = rules & qa - {'__init__'}
if dupes:
    print(f'DUPLICATE FUNCTIONS FOUND: {dupes}')
    exit(1)
print('No rule duplication detected')
"

# ── Migrations ───────────────────────────────────────────────────
uv run alembic upgrade head
uv run python -c "
from tc.db.models import IngestionRun, AgentFinding, ReviewQueue
print('Agent models OK')
"

# ── Tests ────────────────────────────────────────────────────────
uv run pytest tests/agents/ -v
# All tests must pass. None call live APIs.

# ── Veris environment ────────────────────────────────────────────
cd apps/api
veris env list              # estora-ingestion-agent must appear
veris env vars list         # ANTHROPIC_API_KEY must appear (masked)
ls .veris/                  # veris.yaml, Dockerfile.sandbox, .dockerignore

# ── Schema file ──────────────────────────────────────────────────
psql $DATABASE_URL -c "\\dt" | grep ingestion_runs
# Should show ingestion_runs table exists

# ── First simulation ─────────────────────────────────────────────
# After veris env push, run one scenario manually:
# veris simulations create --scenario-set-id <ID> --simulation-timeout 300
# veris simulations status <RUN_ID> --watch
# Expected: at least 8/10 scenarios produce the correct status

# ── CI workflow ──────────────────────────────────────────────────
cat .github/workflows/veris-simulation.yml | grep "quality gate"
# Should print the quality gate step
```

-----

## Development Loop (after initial setup)

```
For every change to the agent pipeline:

1. Make code changes
2. Run unit tests: uv run pytest tests/agents/ -v
3. Push to Veris: veris env push --tag dev-$(git rev-parse --short HEAD)
4. Run simulation: veris run  (interactive)
5. Read report: veris reports create --evaluation-id <ID>
6. Fix regressions based on report recommendations
7. Repeat from step 1 until all 10 scenarios pass

The Veris loop catches multi-step failures that unit tests miss:
  - An agent that passes in isolation but breaks when resolution
    proposals interact with QA findings
  - An orchestrator routing decision that fires for the wrong scenario
  - A name similarity threshold that is too aggressive or too permissive

Do not push to production until veris run scores >= 0.80 across all scenarios.
```
