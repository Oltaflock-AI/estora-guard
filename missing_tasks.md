# MISSING_TASKS.md — Gap Closure Prompt Plans for Claude Code CLI

This file covers every gap identified after the initial TASKS.md build plan.
It assumes TASKS.md has been completed in full.

Read CLAUDE.md before starting any task here.
Work in order within each section. Sections can be parallelized across team members
if working in separate branches, but merge in the order listed here.

-----

## SECTION A — Configuration Files

-----

### TASK A1 — Create `.env.example`

```
Create a file at the repo root named .env.example

This is the canonical reference for every environment variable the application
needs to start. It must be safe to commit to version control — no real values.

Contents must include every variable in this exact format,
with inline comments explaining what each one is and where to get it:

# =============================================
# Estora — environment configuration
# Copy this file to .env and fill in all values.
# Never commit .env to version control.
# =============================================

# ── PostgreSQL ──────────────────────────────
# Full connection string including credentials.
# For local Docker: use the values from infra/docker-compose.yml
# For Supabase: use the connection string from Project Settings → Database
DATABASE_URL=postgresql://estora:estora@postgres:5432/estora

# ── Redis ───────────────────────────────────
# Celery broker and result backend.
# For local Docker: redis://redis:6379/0
# For managed Redis (Upstash, Railway): use the provided URL
REDIS_URL=redis://redis:6379/0

# ── Anthropic API ───────────────────────────
# Required for document intelligence (PDF extraction).
# Get your key at: https://console.anthropic.com/
# Never share this key or commit it to version control.
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# ── JWT Auth ────────────────────────────────
# Secret used to sign and verify JWT tokens.
# Generate a secure value with: openssl rand -hex 32
JWT_SECRET=change-this-to-a-random-256-bit-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Application ─────────────────────────────
# Set to "production" to disable POST /auth/dev-token
# Never deploy with ENVIRONMENT=development on a public server
ENVIRONMENT=development

# ── Frontend ────────────────────────────────
# URL the Next.js app uses to reach the FastAPI backend.
# For local development: http://localhost:8000
# For Docker Compose: http://api:8000 (internal service name)
NEXT_PUBLIC_API_URL=http://localhost:8000

# ── Supabase (optional — only if using Supabase instead of local Postgres) ──
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...

After creating the file, verify .gitignore contains .env (not .env.example).
Run: grep -n '^\.env$' .gitignore
If missing, add it.

Commit with message: chore: add .env.example with all required variables
```

**Verify:**

```bash
diff <(grep '^[A-Z]' .env.example | cut -d= -f1 | sort) \
     <(grep '^[A-Z]' .env         | cut -d= -f1 | sort)
# Should show no differences — every key in .env.example exists in .env
```

-----

### TASK A2 — Create `tailwind.config.ts`

```
Create apps/web/tailwind.config.ts

This file wires the design system tokens from CLAUDE.md into Tailwind's
configuration so they are available as utility classes throughout the app.

Requirements:

1. Content paths must include all component and page files:
   content: [
     './src/app/**/*.{ts,tsx}',
     './src/components/**/*.{ts,tsx}',
     './src/lib/**/*.{ts,tsx}',
   ]

2. Extend the theme with the exact color tokens from the design system:
   colors:
     bg:          '#0C0C0B'
     surface:     '#141413'
     border-subtle: '#2A2A28'
     text-primary:  '#E8E6DF'
     muted:         '#7A7870'
     amber:         '#D4880A'
     amber-bg:      '#1C1609'
     risk-high:     '#C0392B'
     risk-high-bg:  '#1A0A09'
     risk-medium:   '#B8860B'
     risk-medium-bg:'#1A1609'
     risk-low:      '#1A6B4A'
     risk-low-text: '#4CAF7D'
     risk-low-bg:   '#091A10'

3. Extend fontFamily:
   serif: ['DM Serif Display', 'Georgia', 'serif']
   sans:  ['DM Sans', 'system-ui', 'sans-serif']
   mono:  ['DM Mono', 'Courier New', 'monospace']

4. Extend borderRadius:
   sm: '4px'
   md: '8px'
   lg: '12px'

5. Set darkMode to 'class' (the app is dark-only but this allows
   future theming without a rewrite)

6. Do NOT import any Tailwind plugins unless they are already in
   package.json. Do not add tailwindcss-animate or other plugins
   without first checking package.json.

After creating the file, verify it is picked up:
cd apps/web && npm run build 2>&1 | head -20
Should complete without "Cannot find module tailwindcss" errors.

Commit with message: feat: add tailwind.config.ts with design system tokens
```

-----

### TASK A3 — Create `next.config.ts`

```
Create apps/web/next.config.ts

This file must:

1. Define an API proxy rewrite so /api/* requests from the browser
   are forwarded to the FastAPI backend without CORS issues:

   async rewrites() {
     return [
       {
         source: '/api/:path*',
         destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
       },
     ]
   }

   This means the frontend can call /api/v1/documents/upload
   instead of http://localhost:8000/api/v1/documents/upload,
   avoiding CORS preflight failures in both dev and Docker.

2. Set images.domains to allow any external image sources if needed
   (leave as empty array for now: domains: [])

3. Set typescript.ignoreBuildErrors to false — never suppress type errors

4. Set eslint.ignoreDuringBuilds to false — never suppress lint errors

5. Do not use the old next.config.js format with module.exports —
   use the new next.config.ts format with defineConfig or the
   typed NextConfig export.

After creating the file:
cd apps/web && npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health
# Should return 200 (proxied to FastAPI) not 404
kill %1

Commit with message: feat: add next.config.ts with API proxy rewrites
```

-----

### TASK A4 — Audit `apps/api/src/tc/core/config.py`

```
Open apps/api/src/tc/core/config.py and read it in full.

Verify it contains a Pydantic Settings model (or equivalent) that
requires the following fields at startup:

  DATABASE_URL:          str
  REDIS_URL:             str
  ANTHROPIC_API_KEY:     str
  JWT_SECRET:            str
  JWT_ALGORITHM:         str  (default: 'HS256')
  ACCESS_TOKEN_EXPIRE_MINUTES: int (default: 480)
  ENVIRONMENT:           str  (default: 'development')

If ANTHROPIC_API_KEY is missing from the Settings model, add it now:

  anthropic_api_key: str = Field(..., env='ANTHROPIC_API_KEY')

The field must use Field(...) with no default — making it required.
If the key is absent at startup, the app must raise a ValidationError
immediately rather than starting and failing silently when a PDF is uploaded.

After adding:

1. Verify the field is exported from config.py and imported in
   services/document_intelligence.py (once that file exists — if it
   doesn't exist yet, add a TODO comment in config.py noting it is used there)

2. Write a test: tests/test_config.py
   - test_missing_anthropic_key_raises: monkeypatch os.environ to remove
     ANTHROPIC_API_KEY, then import Settings — expect ValidationError

Commit with message: fix: require ANTHROPIC_API_KEY in Settings at startup
```

-----

## SECTION B — Supabase Infrastructure

-----

### TASK B1 — Split `seed.sql` into migrations and seed data

```
The current seed.sql combines schema DDL and seed data in one file.
Supabase CLI requires them to be separate:
  supabase/migrations/ → schema DDL only (tables, indexes, triggers, RLS, enums)
  supabase/seed.sql    → INSERT statements only

Create the following structure:

supabase/
├── config.toml                         ← Task B2 creates this
├── seed.sql                            ← seed data only
└── migrations/
    └── 20260101000000_initial_schema.sql  ← schema DDL only

Steps:

1. Create supabase/migrations/20260101000000_initial_schema.sql

   Copy from seed.sql everything from BEGIN to the last CREATE TRIGGER
   and the RLS ENABLE / CREATE POLICY blocks.
   This file must contain:
   - CREATE EXTENSION
   - DO $$ (enum creation)
   - All CREATE TABLE IF NOT EXISTS statements
   - All CREATE INDEX IF NOT EXISTS statements
   - set_updated_at() function
   - All CREATE TRIGGER statements
   - All ALTER TABLE ENABLE ROW LEVEL SECURITY
   - All CREATE POLICY deny_all_* statements
   
   Do NOT include any INSERT, UPDATE, WITH...INSERT, or COPY statements.
   Do NOT include the BEGIN or COMMIT wrapping — Supabase wraps migrations
   in transactions automatically.

2. Create supabase/seed.sql

   Copy from seed.sql everything from the first WITH first_names AS block
   to the final COMMIT (but not the CREATE TABLE statements).
   This file must contain:
   - BEGIN
   - All WITH...INSERT blocks (people, properties, contracts, etc.)
   - All standalone UPDATE statements (personal property exclusions)
   - COMMIT
   - The verification queries section (commented out)

3. Delete the original seed.sql from the repo root (or move to docs/
   as a reference — do NOT leave it executable at the root where it
   could be accidentally run twice)

4. Update README.md and scripts/dev.sh to reference the new paths.
   Any command that previously referenced seed.sql must now reference
   supabase/seed.sql.

After splitting:
wc -l supabase/migrations/20260101000000_initial_schema.sql
wc -l supabase/seed.sql
# Migration file should be ~200 lines, seed file should be ~400 lines.
# If either is 0 lines the split failed.

Commit with message: refactor: split seed.sql into supabase migration and seed files
```

-----

### TASK B2 — Create `supabase/config.toml`

```
Create supabase/config.toml

This file configures the local Supabase CLI development environment.
It must match the project structure exactly.

Required contents:

[api]
port = 54321
schemas = ["public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
port = 54323
api_url = "http://localhost"

[inbucket]
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
file_size_limit = "50MiB"

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

Notes:
- Do not add a [project_id] line — that is only for linked remote projects
- The db.major_version must be 15 to match the Docker postgres service
- studio.port 54323 conflicts with nothing in docker-compose.yml (verify)

After creating:
supabase start
# Should start all local services without port conflicts.
# If port conflicts exist, update the ports in config.toml and note
# the changes in a comment above the affected line.

Commit with message: feat: add supabase/config.toml for local CLI development
```

-----

### TASK B3 — Create Supabase RLS Policies file

```
Create supabase/policies.sql

This file defines the real access control policies that REPLACE
the deny-all placeholders installed by the migration.

The deny-all policies exist to protect data by default.
This file grants only what the application actually needs.

Context for NY real estate contracts:
- An "agent" user can see contracts where they are the seller's or purchaser's agent
- An "attorney" user can see contracts where they are listed as seller_attorney or purchaser_attorney
- An "admin" user can see all contracts
- No user can ever read another person's masked_tax_id unless they are a party to the same contract
- Escrow agents can see the contract_escrow record for contracts they are assigned to

The policies below assume the app stores the current user's people.id
in the JWT claims as 'person_id', and their role as 'app_role'.
These claims must be set by the auth layer when issuing tokens.

Write the following policies:

-- ── people ──────────────────────────────────────────────────────────────
-- Users can read their own person record
-- Admins can read all person records
-- No one can read masked_tax_id of people not party to a shared contract

DROP POLICY IF EXISTS "deny_all_people" ON public.people;

CREATE POLICY "people_read_own"
  ON public.people
  FOR SELECT
  USING (
    id = (auth.jwt() ->> 'person_id')::uuid
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );

CREATE POLICY "people_read_shared_contract_parties"
  ON public.people
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE (
        c.seller_id    = id OR
        c.purchaser_id = id OR
        c.seller_attorney_id   = id OR
        c.purchaser_attorney_id = id
      )
      AND (
        c.seller_id    = (auth.jwt() ->> 'person_id')::uuid OR
        c.purchaser_id = (auth.jwt() ->> 'person_id')::uuid OR
        c.seller_attorney_id   = (auth.jwt() ->> 'person_id')::uuid OR
        c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
      )
    )
  );

-- ── properties ──────────────────────────────────────────────────────────
-- Users can read properties where they are a party to the contract

DROP POLICY IF EXISTS "deny_all_properties" ON public.properties;

CREATE POLICY "properties_read_contract_parties"
  ON public.properties
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.property_id = id
        AND (
          c.seller_id    = (auth.jwt() ->> 'person_id')::uuid OR
          c.purchaser_id = (auth.jwt() ->> 'person_id')::uuid OR
          c.seller_attorney_id   = (auth.jwt() ->> 'person_id')::uuid OR
          c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
        )
    )
    OR (auth.jwt() ->> 'app_role') = 'admin'
  );

-- ── contracts ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "deny_all_contracts" ON public.contracts;

CREATE POLICY "contracts_read_parties"
  ON public.contracts
  FOR SELECT
  USING (
    seller_id    = (auth.jwt() ->> 'person_id')::uuid OR
    purchaser_id = (auth.jwt() ->> 'person_id')::uuid OR
    seller_attorney_id   = (auth.jwt() ->> 'person_id')::uuid OR
    purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid OR
    (auth.jwt() ->> 'app_role') = 'admin'
  );

-- ── contract child tables ────────────────────────────────────────────────
-- All child tables: readable if user is party to the parent contract
-- Write a reusable helper function to avoid repeating the join logic

CREATE OR REPLACE FUNCTION public.is_contract_party(p_contract_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = p_contract_id
      AND (
        c.seller_id    = (auth.jwt() ->> 'person_id')::uuid OR
        c.purchaser_id = (auth.jwt() ->> 'person_id')::uuid OR
        c.seller_attorney_id   = (auth.jwt() ->> 'person_id')::uuid OR
        c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid OR
        (auth.jwt() ->> 'app_role') = 'admin'
      )
  );
$$;

-- Apply to all child tables using the helper function:
-- contract_personal_property, contract_permitted_exceptions,
-- contract_violations, contract_mortgages, contract_escrow,
-- contract_closing_conditions, contract_apportionments

DROP POLICY IF EXISTS "deny_all_personal_property"     ON public.contract_personal_property;
DROP POLICY IF EXISTS "deny_all_permitted_exceptions"  ON public.contract_permitted_exceptions;
DROP POLICY IF EXISTS "deny_all_violations"            ON public.contract_violations;
DROP POLICY IF EXISTS "deny_all_mortgages"             ON public.contract_mortgages;
DROP POLICY IF EXISTS "deny_all_escrow"                ON public.contract_escrow;
DROP POLICY IF EXISTS "deny_all_closing_conditions"    ON public.contract_closing_conditions;
DROP POLICY IF EXISTS "deny_all_apportionments"        ON public.contract_apportionments;

-- Generate a SELECT policy for each child table using is_contract_party():
CREATE POLICY "personal_property_read_parties"
  ON public.contract_personal_property FOR SELECT
  USING (public.is_contract_party(contract_id));

-- Repeat the pattern for all remaining child tables.

-- ── escrow special case ──────────────────────────────────────────────────
-- Escrow agents can read their assigned escrow records but not other contract data.
-- Add an additional OR clause to the escrow policy only:

CREATE POLICY "escrow_read_assigned_agent"
  ON public.contract_escrow FOR SELECT
  USING (
    public.is_contract_party(contract_id)
    OR escrow_agent_id = (auth.jwt() ->> 'person_id')::uuid
  );

After writing all policies:
1. Create a migration file: supabase/migrations/20260101000001_rls_policies.sql
   with the contents of this file (so policies are applied on supabase db reset)
2. Apply to local: supabase db push OR psql -f supabase/policies.sql

Verify:
-- As a user with no person_id claim, should return 0 rows:
SET LOCAL request.jwt.claims TO '{"person_id": null, "app_role": "guest"}';
SELECT count(*) FROM public.contracts;

Commit with message: feat: add RLS policies for contract party access control
```

-----

### TASK B4 — Create `supabase/generate-types.sh`

```
Create supabase/generate-types.sh

This script generates TypeScript types from the live Supabase schema
so apps/web/src/lib/types.ts never drifts from the actual database.

Contents:

#!/usr/bin/env bash
# Generate TypeScript types from local Supabase schema.
# Run this whenever the schema changes.
# Requires: supabase CLI and a running local Supabase instance.
#
# Usage:
#   ./supabase/generate-types.sh
#   ./supabase/generate-types.sh --remote   (uses SUPABASE_PROJECT_ID env var)

set -euo pipefail

OUTPUT="apps/web/src/lib/database.types.ts"

if [[ "${1:-}" == "--remote" ]]; then
  if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
    echo "Error: SUPABASE_PROJECT_ID is not set."
    exit 1
  fi
  echo "Generating types from remote project: $SUPABASE_PROJECT_ID"
  supabase gen types typescript \
    --project-id "$SUPABASE_PROJECT_ID" \
    > "$OUTPUT"
else
  echo "Generating types from local Supabase instance..."
  supabase gen types typescript --local > "$OUTPUT"
fi

echo "Types written to $OUTPUT"
echo "Review the diff before committing:"
git diff "$OUTPUT" | head -60

Make the script executable: chmod +x supabase/generate-types.sh

Add a script entry to apps/web/package.json:
"gen:types": "bash ../../supabase/generate-types.sh"

Add a note in CONTRIBUTING.md:
  "After any schema migration, run npm run gen:types from apps/web/
  and commit the updated database.types.ts."

Also update apps/web/src/lib/types.ts to import from database.types.ts
where the generated types overlap, using type aliases rather than
duplicating definitions:

  // In types.ts — prefer generated types where available
  import type { Database } from './database.types'
  export type Contract = Database['public']['Tables']['contracts']['Row']
  export type Person   = Database['public']['Tables']['people']['Row']
  export type Property = Database['public']['Tables']['properties']['Row']

Commit with message: feat: add supabase type generation script and package.json integration
```

-----

## SECTION C — Testing Infrastructure

-----

### TASK C1 — Create `tests/fixtures/extraction_response.json`

```
Create apps/api/src/tc/tests/fixtures/extraction_response.json

This is the canonical fixture for all document intelligence tests.
It represents a realistic Claude API response for a Pennsylvania AOS.
(The system uses NY contracts in production; this is a PA document
used as a test fixture because it was the original demo contract —
both states follow the same JSON schema.)

The file must be valid JSON matching the exact schema that
services/document_intelligence.py expects from Claude.

Required structure and exact content:

{
  "doc_type": "agreement_of_sale",
  "extractions": [
    {"field_name": "buyer_name",                "field_value": "Sarah Mitchell",            "confidence": 0.97},
    {"field_name": "seller_name",               "field_value": "James and Carol Park",      "confidence": 0.96},
    {"field_name": "property_address",          "field_value": "123 Maple Street, Anytown PA 19001", "confidence": 0.99},
    {"field_name": "purchase_price",            "field_value": "$425,000",                  "confidence": 0.98},
    {"field_name": "close_date",                "field_value": "2026-03-28",                "confidence": 0.95},
    {"field_name": "inspection_deadline",       "field_value": "2026-03-08",                "confidence": 0.88},
    {"field_name": "financing_contingency_date","field_value": "2026-03-15",                "confidence": 0.87},
    {"field_name": "earnest_money",             "field_value": "$8,500",                    "confidence": 0.96},
    {"field_name": "inspection_contingency",    "field_value": "yes",                       "confidence": 0.94},
    {"field_name": "financing_contingency",     "field_value": "yes",                       "confidence": 0.93},
    {"field_name": "appraisal_contingency",     "field_value": "yes",                       "confidence": 0.91}
  ],
  "risk_flags": [
    {
      "flag_type": "tight_deadline",
      "severity": "high",
      "title": "Short inspection window",
      "explanation": "Inspection deadline is only 5 days from contract date (March 3 to March 8). The typical minimum is 10 days. This limits the buyer's ability to schedule specialty inspections such as radon, sewer scope, or structural engineering review."
    },
    {
      "flag_type": "missing_clause",
      "severity": "medium",
      "title": "No radon contingency noted",
      "explanation": "The contract does not include a radon test or mitigation contingency. Radon is prevalent in this region. Without this clause, the buyer has no recourse if elevated radon levels are found after closing."
    },
    {
      "flag_type": "missing_clause",
      "severity": "low",
      "title": "HOA document request not included",
      "explanation": "If the property is subject to HOA governance, no clause requires the seller to deliver HOA documents, meeting minutes, or financial statements prior to closing. Verify whether an HOA exists and add appropriate language."
    }
  ],
  "summary": "This is a standard Agreement of Sale for 123 Maple Street, Anytown PA 19001, between buyer Sarah Mitchell and sellers James and Carol Park at a purchase price of $425,000. The contract includes financing, inspection, and appraisal contingencies with a settlement date of March 28, 2026. Three risk items were identified, including a notably short 5-day inspection window that may limit the buyer's ability to conduct thorough due diligence."
}

Also create: apps/api/src/tc/tests/fixtures/__init__.py (empty)
Also create: apps/api/src/tc/tests/fixtures/invalid_not_pdf.pdf
  This is a text file with .pdf extension for testing magic byte validation.
  Contents: "This is not a PDF file. It contains no PDF magic bytes."
  Save as plain text with .pdf extension — the point is it starts with 'T', not '%PDF-'

Also create: apps/api/src/tc/tests/fixtures/minimal_valid.pdf
  A real minimal PDF. Use this Python snippet to generate it:

  python3 -c "
  import struct
  # Minimal valid PDF: 1 page, no content, passes magic byte check
  pdf = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  pdf += b'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
  pdf += b'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n'
  pdf += b'xref\n0 4\ntrailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n0\n%%EOF\n'
  open('apps/api/src/tc/tests/fixtures/minimal_valid.pdf', 'wb').write(pdf)
  "

Commit with message: test: add extraction fixture JSON and PDF test files
```

-----

### TASK C2 — Update `tests/conftest.py` with mock fixtures

```
Open apps/api/src/tc/tests/conftest.py and read it in full.

Add the following fixtures if they are not already present.
Do not remove or modify any existing fixtures — only add.

1. FIXTURE_EXTRACTION_JSON constant
   Load the fixture file at the top of conftest.py:

   import json
   import pathlib

   FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures"

   with open(FIXTURES_DIR / "extraction_response.json") as f:
       FIXTURE_EXTRACTION_JSON = json.dumps(json.load(f))

   This pre-serializes the fixture so the mock can return it
   as a string (matching what the real Claude API returns).

2. mock_anthropic fixture

   from types import SimpleNamespace
   import pytest

   @pytest.fixture
   def mock_anthropic(monkeypatch):
       """
       Replaces the Anthropic client with a fake that returns the
       canned extraction fixture. Tests using this fixture never
       make live API calls.

       Usage:
           def test_extraction(mock_anthropic):
               result = run_extraction(pdf_bytes)
               assert result["doc_type"] == "agreement_of_sale"
       """
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

3. mock_anthropic_malformed fixture
   For testing the retry-on-bad-JSON path:

   @pytest.fixture
   def mock_anthropic_malformed(monkeypatch):
       """Returns unparseable JSON on first call, valid JSON on second call."""
       call_count = {"n": 0}

       def fake_create(**kwargs):
           call_count["n"] += 1
           if call_count["n"] == 1:
               return SimpleNamespace(
                   content=[SimpleNamespace(text="this is not json {{{")]
               )
           return SimpleNamespace(
               content=[SimpleNamespace(text=FIXTURE_EXTRACTION_JSON)]
           )

       monkeypatch.setattr(
           "tc.services.document_intelligence.anthropic.Anthropic",
           lambda: SimpleNamespace(
               messages=SimpleNamespace(create=fake_create)
           )
       )

4. mock_anthropic_always_fails fixture
   For testing the double-failure raise path:

   @pytest.fixture
   def mock_anthropic_always_fails(monkeypatch):
       """Always returns unparseable JSON — both calls fail."""
       def fake_create(**kwargs):
           return SimpleNamespace(
               content=[SimpleNamespace(text="{this: is not valid json")]
           )

       monkeypatch.setattr(
           "tc.services.document_intelligence.anthropic.Anthropic",
           lambda: SimpleNamespace(
               messages=SimpleNamespace(create=fake_create)
           )
       )

5. sample_pdf_bytes fixture
   Loads the minimal valid PDF fixture:

   @pytest.fixture
   def sample_pdf_bytes():
       """Returns bytes of a minimal valid PDF for upload tests."""
       return (FIXTURES_DIR / "minimal_valid.pdf").read_bytes()

   @pytest.fixture
   def invalid_pdf_bytes():
       """Returns bytes that are NOT a valid PDF (wrong magic bytes)."""
       return (FIXTURES_DIR / "invalid_not_pdf.pdf").read_bytes()

After adding all fixtures:
cd apps/api && uv run pytest tests/conftest.py --collect-only
# Should show all fixtures are importable with no errors.

Commit with message: test: add Claude mock fixtures and PDF byte fixtures to conftest.py
```

-----

### TASK C3 — Create `tests/test_document_intelligence.py`

```
Create apps/api/src/tc/tests/test_document_intelligence.py

This test file covers the document intelligence service end-to-end.
Each test is independent. Each test that calls Claude uses a mock fixture.
No test in this file makes a live API call.

Import requirements:
  import json
  import pytest
  from tc.services.document_intelligence import (
      extract_text_from_pdf,
      run_extraction,
  )

Write the following tests:

──────────────────────────────────────────────────
TEST 1: test_pdf_magic_byte_validation
──────────────────────────────────────────────────
def test_pdf_magic_byte_validation(invalid_pdf_bytes):
    """
    A file with .pdf extension but wrong magic bytes must raise ValueError
    before any Claude API call is made.
    The error message must mention "valid PDF" or "magic bytes".
    """
    with pytest.raises(ValueError, match="valid PDF"):
        run_extraction(invalid_pdf_bytes)

──────────────────────────────────────────────────
TEST 2: test_empty_pdf_raises
──────────────────────────────────────────────────
def test_empty_pdf_raises(mock_anthropic):
    """
    A valid PDF that yields < 100 chars of extracted text must raise ValueError.
    Use the minimal_valid.pdf fixture — it has no content pages.
    mock_anthropic is included to confirm the error is raised BEFORE Claude is called.
    """
    # minimal_valid.pdf is structurally valid but has no text content
    from pathlib import Path
    minimal = (Path(__file__).parent / "fixtures" / "minimal_valid.pdf").read_bytes()
    with pytest.raises(ValueError, match="empty"):
        run_extraction(minimal)

──────────────────────────────────────────────────
TEST 3: test_extraction_returns_all_fields
──────────────────────────────────────────────────
def test_extraction_returns_all_fields(mock_anthropic, sample_pdf_bytes):
    """
    A successful extraction must return a dict with all 11 expected field_names.
    """
    EXPECTED_FIELDS = {
        "buyer_name", "seller_name", "property_address", "purchase_price",
        "close_date", "inspection_deadline", "financing_contingency_date",
        "earnest_money", "inspection_contingency", "financing_contingency",
        "appraisal_contingency",
    }
    result = run_extraction(sample_pdf_bytes)
    returned_fields = {e["field_name"] for e in result["extractions"]}
    assert EXPECTED_FIELDS == returned_fields

──────────────────────────────────────────────────
TEST 4: test_confidence_scores_are_valid_floats
──────────────────────────────────────────────────
def test_confidence_scores_are_valid_floats(mock_anthropic, sample_pdf_bytes):
    """
    Every extraction must have a confidence score that is a float between 0.0 and 1.0.
    """
    result = run_extraction(sample_pdf_bytes)
    for extraction in result["extractions"]:
        assert isinstance(extraction["confidence"], float), \
            f"confidence for {extraction['field_name']} is not a float"
        assert 0.0 <= extraction["confidence"] <= 1.0, \
            f"confidence for {extraction['field_name']} is out of range"

──────────────────────────────────────────────────
TEST 5: test_risk_flags_have_required_fields
──────────────────────────────────────────────────
def test_risk_flags_have_required_fields(mock_anthropic, sample_pdf_bytes):
    """
    Every risk flag must have: flag_type, severity, title, explanation.
    Severity must be one of: low, medium, high.
    flag_type must be one of the 5 known types.
    """
    VALID_SEVERITIES = {"low", "medium", "high"}
    VALID_FLAG_TYPES = {
        "tight_deadline", "missing_clause", "unusual_condition",
        "unclear_language", "material_defect"
    }
    result = run_extraction(sample_pdf_bytes)
    assert len(result["risk_flags"]) > 0, "Expected at least one risk flag"
    for flag in result["risk_flags"]:
        assert "flag_type"   in flag
        assert "severity"    in flag
        assert "title"       in flag
        assert "explanation" in flag
        assert flag["severity"]  in VALID_SEVERITIES
        assert flag["flag_type"] in VALID_FLAG_TYPES

──────────────────────────────────────────────────
TEST 6: test_summary_is_non_empty_string
──────────────────────────────────────────────────
def test_summary_is_non_empty_string(mock_anthropic, sample_pdf_bytes):
    """The summary field must be a non-empty string."""
    result = run_extraction(sample_pdf_bytes)
    assert isinstance(result.get("summary"), str)
    assert len(result["summary"]) > 20

──────────────────────────────────────────────────
TEST 7: test_json_fence_stripping
──────────────────────────────────────────────────
def test_json_fence_stripping(monkeypatch, sample_pdf_bytes):
    """
    If Claude wraps its response in ```json ... ``` fences,
    the service must strip them and still parse successfully.
    """
    import json
    from types import SimpleNamespace
    from tests.conftest import FIXTURE_EXTRACTION_JSON

    fenced = "```json\n" + FIXTURE_EXTRACTION_JSON + "\n```"

    def fake_create(**kwargs):
        return SimpleNamespace(content=[SimpleNamespace(text=fenced)])

    monkeypatch.setattr(
        "tc.services.document_intelligence.anthropic.Anthropic",
        lambda: SimpleNamespace(messages=SimpleNamespace(create=fake_create))
    )
    result = run_extraction(sample_pdf_bytes)
    assert result["doc_type"] == "agreement_of_sale"

──────────────────────────────────────────────────
TEST 8: test_malformed_json_retries_once
──────────────────────────────────────────────────
def test_malformed_json_retries_once(mock_anthropic_malformed, sample_pdf_bytes):
    """
    If the first Claude call returns malformed JSON, the service retries once.
    The second call returns valid JSON. The result must be the valid extraction.
    """
    result = run_extraction(sample_pdf_bytes)
    assert result["doc_type"] == "agreement_of_sale"

──────────────────────────────────────────────────
TEST 9: test_both_calls_fail_raises_value_error
──────────────────────────────────────────────────
def test_both_calls_fail_raises_value_error(
    mock_anthropic_always_fails, sample_pdf_bytes
):
    """
    If both Claude calls return malformed JSON, the service must raise ValueError.
    The error message must mention "unparseable" or "parse".
    """
    with pytest.raises(ValueError, match="parse|unparseable"):
        run_extraction(sample_pdf_bytes)

──────────────────────────────────────────────────
TEST 10: test_doc_type_is_valid_enum_value
──────────────────────────────────────────────────
def test_doc_type_is_valid_enum_value(mock_anthropic, sample_pdf_bytes):
    """doc_type must be one of the 4 known values."""
    VALID_DOC_TYPES = {"agreement_of_sale", "disclosure", "addendum", "other"}
    result = run_extraction(sample_pdf_bytes)
    assert result["doc_type"] in VALID_DOC_TYPES

After writing all tests:
cd apps/api && uv run pytest tests/test_document_intelligence.py -v

All 10 tests must pass.
If any test fails with ImportError, the service file does not exist yet —
implement services/document_intelligence.py first (see TASKS.md Task 3b).

Commit with message: test: add full document intelligence test suite (10 tests)
```

-----

### TASK C4 — Create `tests/test_config.py`

```
Create apps/api/src/tc/tests/test_config.py

Tests for the Settings model in core/config.py.

Write the following tests:

1. test_missing_anthropic_key_raises
   Remove ANTHROPIC_API_KEY from the environment using monkeypatch,
   then attempt to instantiate Settings().
   Expect a pydantic ValidationError (or ValueError if using os.environ directly).

   import os
   import pytest
   from pydantic import ValidationError

   def test_missing_anthropic_key_raises(monkeypatch):
       monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
       with pytest.raises((ValidationError, ValueError)):
           from tc.core.config import Settings
           Settings()

2. test_all_required_fields_present
   With all env vars set (via monkeypatch or existing test env),
   instantiate Settings and assert each required field is truthy:

   def test_all_required_fields_present(monkeypatch):
       monkeypatch.setenv("DATABASE_URL",      "postgresql://test:test@localhost/test")
       monkeypatch.setenv("REDIS_URL",         "redis://localhost:6379/0")
       monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key")
       monkeypatch.setenv("JWT_SECRET",        "test-secret-32-chars-minimum-here")
       monkeypatch.setenv("ENVIRONMENT",       "development")
       from tc.core.config import Settings
       s = Settings()
       assert s.anthropic_api_key
       assert s.database_url
       assert s.redis_url
       assert s.jwt_secret

3. test_production_env_is_recognized
   With ENVIRONMENT=production, verify the Settings object reflects this
   (used to gate the dev-token endpoint):

   def test_production_env_is_recognized(monkeypatch):
       monkeypatch.setenv("ENVIRONMENT", "production")
       from tc.core.config import Settings
       s = Settings()
       assert s.environment == "production"

cd apps/api && uv run pytest tests/test_config.py -v

Commit with message: test: add Settings config validation tests
```

-----

## SECTION D — Frontend Infrastructure

-----

### TASK D1 — Create `apps/web/src/app/globals.css`

```
Create apps/web/src/app/globals.css

This file is the foundation of the design system.
It must be imported in layout.tsx BEFORE any component styles.

Exact contents required:

/* =========================================================
   Estora — Global Design System
   Import order in layout.tsx: globals.css → Google Fonts
   ========================================================= */

/* ── Reset ─────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Design tokens ──────────────────────────────────────── */
:root {
  /* Backgrounds */
  --bg:              #0C0C0B;
  --surface:         #141413;
  --surface-hover:   #1A1A18;

  /* Borders */
  --border:          #2A2A28;
  --border-strong:   #3D3D3A;

  /* Text */
  --text:            #E8E6DF;
  --muted:           #7A7870;
  --muted-strong:    #9A9890;

  /* Amber — AI highlights, CTAs, active state */
  --amber:           #D4880A;
  --amber-light:     #E8A030;
  --amber-bg:        #1C1609;
  --amber-border:    #3D2A08;

  /* Risk: High */
  --risk-high:       #C0392B;
  --risk-high-bg:    #1A0A09;
  --risk-high-border:#3D1A14;

  /* Risk: Medium */
  --risk-med:        #B8860B;
  --risk-med-bg:     #1A1609;
  --risk-med-border: #3D2E0A;

  /* Risk: Low / Done */
  --risk-low:        #1A6B4A;
  --risk-low-text:   #4CAF7D;
  --risk-low-bg:     #091A10;
  --risk-low-border: #0D3320;

  /* Typography */
  --font-serif:      'DM Serif Display', Georgia, 'Times New Roman', serif;
  --font-sans:       'DM Sans', system-ui, -apple-system, sans-serif;
  --font-mono:       'DM Mono', 'Courier New', Courier, monospace;

  /* Spacing scale */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* ── Base ───────────────────────────────────────────────── */
html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  background:               var(--bg);
  color:                    var(--text);
  font-family:              var(--font-sans);
  font-size:                14px;
  line-height:              1.6;
  -webkit-font-smoothing:   antialiased;
  -moz-osx-font-smoothing:  grayscale;
}

/* ── Typography helpers ─────────────────────────────────── */
.font-serif { font-family: var(--font-serif); }
.font-mono  { font-family: var(--font-mono);  }

/* ── Animations ─────────────────────────────────────────── */

/* Stagger fade-in for extraction rows.
   Usage: <div className="extraction-row" style={{'--i': index} as CSSProperties}>
   Each row fades in 50ms after the previous. */
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0);   }
}
.extraction-row {
  animation:       fadeSlideIn 220ms ease both;
  animation-delay: calc(var(--i, 0) * 50ms);
}

/* Pulse for overdue milestone dots */
@keyframes pulse {
  0%, 100% { opacity: 1;   }
  50%       { opacity: 0.3; }
}
.pulse-dot {
  animation: pulse 1.8s ease-in-out infinite;
}

/* Blinking cursor after processing step text in DocumentDropzone */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.cursor-blink::after {
  content:   '▌';
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  color:     var(--amber);
}

/* Health bar fill transition */
.health-fill {
  transition: height 600ms cubic-bezier(0.4, 0, 0.2, 1),
              background-color 400ms ease;
}

/* ── Component primitives ───────────────────────────────── */

/* Badge — severity, status labels */
.badge {
  display:        inline-block;
  padding:        2px 6px;
  border-radius:  var(--radius-sm);
  font-family:    var(--font-mono);
  font-size:      10px;
  font-weight:    500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height:    1.4;
}
.badge-amber  { background: var(--amber-bg);    color: var(--amber);       border: 0.5px solid var(--amber-border);    }
.badge-red    { background: var(--risk-high-bg); color: var(--risk-high);   border: 0.5px solid var(--risk-high-border); }
.badge-yellow { background: var(--risk-med-bg);  color: var(--risk-med);    border: 0.5px solid var(--risk-med-border);  }
.badge-green  { background: var(--risk-low-bg);  color: var(--risk-low-text); border: 0.5px solid var(--risk-low-border); }
.badge-muted  { background: var(--surface);      color: var(--muted);       border: 0.5px solid var(--border);           }

/* Section label — "TIMELINE", "HEALTH", "TASKS" */
.section-label {
  font-family:    var(--font-mono);
  font-size:      10px;
  font-weight:    500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color:          var(--muted);
  margin-bottom:  var(--space-3);
}

/* Horizontal rule */
.rule {
  border: none;
  border-top: 1px solid var(--border);
  margin: var(--space-4) 0;
}

/* Card surface */
.card {
  background:    var(--surface);
  border:        0.5px solid var(--border);
  border-radius: var(--radius-lg);
  padding:       var(--space-4);
}

/* Insight block — left-bordered quote style */
.insight {
  border-left:   2px solid var(--amber);
  background:    var(--amber-bg);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  padding:       var(--space-3) var(--space-4);
  font-style:    italic;
  font-size:     13px;
  color:         var(--muted-strong);
  line-height:   1.65;
}

/* ── Scrollbar ──────────────────────────────────────────── */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

After creating this file, add the import to layout.tsx:
import './globals.css'

This import must be the FIRST import in layout.tsx, before any component imports.

Verify: cd apps/web && npm run build
No PostCSS or CSS parsing errors should appear.

Commit with message: feat: add globals.css with full design system tokens and animation utilities
```

-----

### TASK D2 — Reconcile `auth.ts` and `api.ts` token strategy

```
Open both apps/web/src/lib/auth.ts and apps/web/src/lib/api.ts and read both in full.

The goal is a single, consistent token strategy across the application.
There must be exactly one place where tokens are stored and retrieved.
Components must never call getDevToken() directly — only through a
centralized hook or utility.

Required strategy:
1. Token is stored in sessionStorage under the key 'estora_token'
   (sessionStorage is cleared when the tab closes — appropriate for legal data)
2. A single function getToken() retrieves it
3. A single function setToken(token) stores it
4. A single function clearToken() removes it
5. api.ts uses getToken() internally — callers do not pass tokens as arguments

Resolve any conflicts between auth.ts and api.ts as follows:

If auth.ts handles token storage (setToken, getToken, clearToken):
  - Keep the storage logic in auth.ts
  - Import getToken from auth.ts into api.ts
  - Remove the token: string parameter from all api.ts functions
    (they should call getToken() internally)
  - Update all call sites in pages and components to remove the token argument

If api.ts handles token storage inline:
  - Move the storage logic to auth.ts
  - Have api.ts import from auth.ts
  - Same cleanup as above

If neither has storage logic (both are incomplete):
  - Add to auth.ts:
    const TOKEN_KEY = 'estora_token'
    export const getToken  = ()                => sessionStorage.getItem(TOKEN_KEY)
    export const setToken  = (t: string)       => sessionStorage.setItem(TOKEN_KEY, t)
    export const clearToken = ()               => sessionStorage.removeItem(TOKEN_KEY)
    export async function initAuth(): Promise<string> {
      const existing = getToken()
      if (existing) return existing
      const token = await fetchDevToken()
      setToken(token)
      return token
    }
  - api.ts imports getToken from auth.ts and uses it internally

After reconciling, verify:
- grep -r "token: string" apps/web/src/    # Should return nothing
- grep -r "getToken()" apps/web/src/       # Should show usage in api.ts only
- grep -r "sessionStorage" apps/web/src/   # Should show usage in auth.ts only

Commit with message: refactor: centralize token storage in auth.ts, remove token params from api.ts
```

-----

## SECTION E — Documentation

-----

### TASK E1 — Create `DEMO.md`

```
Create DEMO.md at the repo root.

This is a standalone demo guide the team can print and hold during the presentation.
It must be self-contained — readable without access to any other file.

Structure:

# Estora — Demo Guide

## Setup (do this before entering the room)

[ ] docker compose -f infra/docker-compose.yml up -d
[ ] docker compose -f infra/docker-compose.yml exec api uv run alembic upgrade head
[ ] uv run python scripts/seed_db.py
[ ] Open browser to http://localhost:3000
[ ] Verify dashboard shows 3 seeded deals
[ ] Have sample_contract.pdf ready on desktop (or open in Finder/Explorer)
[ ] Confirm ANTHROPIC_API_KEY is in .env
[ ] Do a full dry run — time it — target 90 seconds

## The 5-Beat Script

### Beat 1 — 0:00–0:15 — Frame the problem
Say: "Cooper is a real estate agent in New York. Every deal he runs starts
     the same way — a 40-page contract lands in his inbox. He reads it manually,
     highlights dates by hand, and hopes he doesn't miss anything. We built Estora."

Action: Point to the dashboard. The 3 seeded deals are visible.

### Beat 2 — 0:15–0:45 — The upload
Say: "This is an Agreement of Sale. Cooper drops it in."

Action: Drag sample_contract.pdf into the dropzone.
        The processing animation begins:
        "Reading document... Identifying parties... Extracting key dates...
         Flagging potential risks... Building timeline..."

Say: "We're using Claude to read the contract the same way an experienced
     agent would. Not keyword matching — actual comprehension."

### Beat 3 — 0:45–1:05 — The extraction reveal
Action: The extraction review page appears.
        Point to: Buyer name, seller name, close date.
        Then point to the risk flags panel.

Say: "Eleven fields extracted in seconds. But this is the important part —"
     (point to HIGH flag) "— the inspection window is only 5 days.
     That's dangerously short. An agent who misses this has a problem.
     Estora flags it automatically. Cooper didn't have to know to look."

### Beat 4 — 1:05–1:20 — One click
Action: Click "Create Transaction."
        Wait for navigation to the transaction detail page.

Say: "One click. The entire deal is now live. Timeline built.
     Tasks assigned. Health score calculated.
     Cooper never typed a single field."

### Beat 5 — 1:20–1:30 — The closer
Action: Pause on the health bar.

Say: "This is the deal's health score. Green means on track.
     As deadlines approach, it shifts to amber, then red.
     Estora watches every deal, every 15 minutes, so Cooper doesn't have to.
     That's professional-grade transaction control — for every deal,
     not just the ones he manages to keep track of."

## If Something Breaks

### Upload hangs or times out
Recovery: Say "We're running extraction synchronously for the demo — in production
           this is queued." Navigate to the pre-seeded deal at 123 Maple St.
           Continue from Beat 3 using the seeded data.

### Extraction returns an error
Recovery: Refresh the page. Navigate directly to:
          http://localhost:3000/dashboard/transactions
          Click the first seeded deal. Continue from Beat 4.

### Transaction detail page is blank
Recovery: Say "We'll skip the creation step and jump straight to an active deal."
          Navigate to the seeded transaction. Continue from Beat 5.

### App won't start at all
Recovery: Fall back to the slideshow (the HTML artifact from the pitch deck).
          Walk through the 6 stages manually. The story is more important than the demo.

## Numbers to have ready (judges will ask)

- How many deals can one agent manage at once? (No hard limit; health score
  degrades based on deadline density, not deal count)
- How long does extraction take? (3–8 seconds for a 40-page PDF)
- What happens if Claude misreads a date? (Confidence score < 0.6 flags it
  for manual review; agent confirms before the transaction is created)
- What does it cost per document? (Approximately $0.02 per extraction at
  current Claude API pricing for a 40-page contract)
- Is it NY-only? (Currently calibrated for NY Form 8068; state-specific
  rule sets are on the roadmap)

Commit with message: docs: add standalone DEMO.md with setup checklist and recovery scripts
```

-----

### TASK E2 — Create `docs/decisions/0003-document-intelligence.md`

```
Create docs/decisions/0003-document-intelligence.md

Use the exact ADR format as 0001-tech-stack.md and 0002-db-schema.md.
Read both of those files first to match their format precisely.

Required contents (adapt the format to match existing ADRs):

Title:   Document Intelligence Architecture
Date:    2026-01-01
Status:  Accepted
Deciders: Engineering team

Context:
  Estora needed a way to read real estate contracts and extract structured
  data — party names, dates, contingency terms, purchase price — without
  agents entering any fields manually. Contracts arrive as PDF files.
  The extracted data must be reliable enough to auto-populate a transaction
  timeline without agent correction in the happy path.

  Options considered:
    A) Rule-based PDF parsing (regex, coordinate extraction)
    B) Fine-tuned open-source model
    C) Claude Sonnet via Anthropic API

Decision:
  Option C — Claude Sonnet (claude-sonnet-4-20250514) via the Anthropic API.

  Implementation: apps/api/src/tc/services/document_intelligence.py
  - pypdf extracts raw text from the PDF
  - Text is truncated to 12,000 characters and sent to Claude with a
    structured extraction prompt
  - Claude returns a JSON object containing extractions and risk_flags
  - The endpoint caller writes results to the database

  The extraction runs synchronously in the POST /documents/upload handler
  for the initial build. All Claude API calls are isolated to the
  document_intelligence service — no other file imports anthropic.

Consequences:
  Positive:
  + No model training or maintenance required
  + Risk flag generation ("this inspection window is too short") requires
    contextual reasoning that rule-based approaches cannot do reliably
  + Single implementation point — all AI logic in one file
  + JSON parsing with retry is robust to occasional model formatting drift

  Negative:
  - Synchronous extraction blocks the FastAPI event loop for 3–10 seconds
    under concurrent load
  - 12,000 character truncation silently drops the back half of long documents
  - Risk flag thresholds are calibrated for New York Form 8068;
    other state forms will produce incorrect flags
  - API cost: approximately $0.02 per contract extraction

  Mitigations planned:
  - Move extraction to Celery queue (eliminates blocking)
  - Section-aware chunking (eliminates truncation problem)
  - State-specific prompt variants in a future rule set expansion

Prompt injection defense:
  Document text is wrapped in explicit delimiters before being sent to Claude:
    ---DOCUMENT TEXT BEGINS---
    {raw_text}
    ---DOCUMENT TEXT ENDS---
  Claude is instructed in the system portion of the prompt to treat all
  content between these delimiters as data to analyze, not as instructions.
  Low-confidence extractions (< 0.6) are flagged for agent review rather
  than silently accepted.

Commit with message: docs: add ADR 0003 for document intelligence architecture
```

-----

### TASK E3 — Create `docs/decisions/0004-supabase-rls.md`

```
Create docs/decisions/0004-supabase-rls.md

Required contents:

Title:   Row Level Security Strategy
Date:    2026-01-01
Status:  Accepted

Context:
  Supabase exposes all PostgreSQL tables via a PostgREST REST API.
  Any authenticated user can query any table unless RLS is enabled.
  The contracts schema contains PII (names, masked tax IDs), financial data
  (purchase prices, mortgage amounts), and legal documents (contract terms).
  Unauthorized access to this data is a regulatory and legal liability.

Decision:
  Enable RLS on all tables at migration time.
  Install deny-all policies by default in the schema migration.
  Define role-specific access policies in a separate migration file
  (supabase/migrations/20260101000001_rls_policies.sql).

  The deny-all → explicit-grant pattern means:
  - A new table is inaccessible by default until a policy is written
  - Developers cannot accidentally expose data by forgetting RLS
  - Policy changes require a deliberate migration, not an ad-hoc ALTER

  Access control model:
  - Parties to a contract (seller, purchaser, their attorneys) can read
    that contract and all its child records
  - Escrow agents can read their assigned escrow records
  - Admins can read all records
  - No user can read another person's masked_tax_id unless they share a contract

  Role claims are passed in the JWT:
  - person_id: the people.id UUID of the authenticated user
  - app_role:  'agent' | 'attorney' | 'escrow_agent' | 'admin'

  The is_contract_party(contract_id uuid) helper function encapsulates
  the join logic and is reused across all child table policies.

Consequences:
  Positive:
  + Data is protected by default — new tables are inaccessible until
    explicitly opened
  + The access model maps directly to NY real estate law concepts
    (parties to a contract have standing; non-parties do not)
  + Policy changes are auditable via the migration history

  Negative:
  - Deny-all policies will break the application if role-specific policies
    are not applied before connecting the frontend
  - JWT claims must be correctly set by the auth layer; if person_id is
    absent, all data appears empty (silent failure)
  - Supabase service role key bypasses RLS — it must never be used in
    client-side code

  Action required before production:
  - Apply supabase/policies.sql via migration
  - Verify JWT claim injection in the auth service
  - Test each role type against the RLS policies

Commit with message: docs: add ADR 0004 for Supabase RLS security strategy
```

-----

### TASK E4 — Update `docs/api.md` with document intelligence endpoints

```
Open docs/api.md and read it in full.

Add a new section titled "Document Intelligence" that documents
the following endpoints. Match the formatting style of the existing
api.md content exactly.

Document these 5 endpoints:

─────────────────────────────────────────────────
POST /api/v1/documents/upload
─────────────────────────────────────────────────
Description:
  Upload a PDF contract. Extracts structured fields and risk flags
  using Claude Sonnet. Creates a Document record and associated
  Extraction and RiskFlag records. Returns the full extraction payload.

Authentication: Bearer token required

Request:
  Content-Type: multipart/form-data
  Body field: file (PDF binary, max 10MB)

Validation:
  - File must start with %PDF- magic bytes
  - File must be under 10MB
  - Extracted text must be at least 100 characters

Response 200:
  {
    "document_id":       "uuid",
    "doc_type":          "agreement_of_sale | disclosure | addendum | other",
    "summary":           "string — plain English summary from Claude",
    "extractions": [
      {
        "field_name":    "buyer_name | seller_name | property_address | ...",
        "field_value":   "string or null",
        "confidence":    0.0–1.0
      }
    ],
    "risk_flags": [
      {
        "flag_type":     "tight_deadline | missing_clause | unusual_condition | unclear_language | material_defect",
        "severity":      "low | medium | high",
        "title":         "string",
        "explanation":   "string"
      }
    ],
    "extraction_count":  11,
    "risk_count":        3
  }

Response 400: File is not a valid PDF, or exceeds 10MB
Response 422: PDF is valid but Claude could not extract usable content
Response 500: Unexpected extraction failure

─────────────────────────────────────────────────
GET /api/v1/documents/{document_id}
─────────────────────────────────────────────────
Description: Retrieve a document record and its current status.

Response 200:
  {
    "id":         "uuid",
    "filename":   "string",
    "doc_type":   "string or null",
    "status":     "pending | processing | done | failed",
    "created_at": "ISO 8601"
  }

Response 404: Document not found or not owned by the requesting org

─────────────────────────────────────────────────
GET /api/v1/documents/{document_id}/risk-flags
─────────────────────────────────────────────────
Description: Retrieve all risk flags for a document.

Response 200:
  [
    {
      "id":                   "uuid",
      "flag_type":            "string",
      "severity":             "low | medium | high",
      "title":                "string",
      "explanation":          "string",
      "acknowledged":         false,
      "acknowledged_at":      null,
      "acknowledged_note":    null
    }
  ]
  Sorted: high → medium → low, unacknowledged before acknowledged.

─────────────────────────────────────────────────
POST /api/v1/documents/{document_id}/create-transaction
─────────────────────────────────────────────────
Description:
  Creates a Transaction from the extracted data in a Document.
  Idempotent — if a Transaction already exists for this document,
  returns the existing transaction_id without creating a duplicate.
  Triggers the generate_timeline Celery task after creation.

Response 200:
  {
    "transaction_id": "uuid",
    "title":          "123 Maple Street, Anytown NY",
    "status":         "active",
    "close_date":     "YYYY-MM-DD or null"
  }

Response 404: Document not found
Response 422: Document extraction has not completed (status != done)

─────────────────────────────────────────────────
PATCH /api/v1/documents/{document_id}/risk-flags/{flag_id}/acknowledge
─────────────────────────────────────────────────
Description:
  Marks a risk flag as intentionally acknowledged by the agent.
  Removes the flag from the active risk panel.
  Writes to the audit trail with the agent's note.

Request body:
  { "note": "string (optional — agent's reason for acknowledging)" }

Response 200:
  {
    "id":                "uuid",
    "acknowledged":      true,
    "acknowledged_at":   "ISO 8601",
    "acknowledged_note": "string or null"
  }

Response 404: Flag not found or not associated with the requesting org

─────────────────────────────────────────────────

After adding the section, verify the document renders correctly:
cat docs/api.md | wc -l
# Should be longer than before this edit

Commit with message: docs: add document intelligence endpoints to api.md
```

-----

### TASK E5 — Update `CONTRIBUTING.md`

```
Open CONTRIBUTING.md and read it in full.

Add the following sections if they are not already present.
Do not remove any existing content — only add.

─────────────────────────────────────────────────
## Adding a new extraction field
─────────────────────────────────────────────────

1. Add the field to the extractions array in EXTRACTION_PROMPT
   in apps/api/src/tc/services/document_intelligence.py

   Each entry must have:
     {"field_name": "your_field", "field_value": "...", "confidence": 0.0}

2. No database migration needed.
   Extractions are stored as key/value rows in the extractions table.
   The field_name column is free text — new fields are stored automatically.

3. Add the field to ExtractionViewer.tsx:
   apps/web/src/components/ExtractionViewer.tsx
   Add it to the FIELD_LABELS map with a human-readable label.

4. Add a test case to:
   apps/api/src/tc/tests/fixtures/extraction_response.json
   and
   apps/api/src/tc/tests/test_document_intelligence.py
   (in test_extraction_returns_all_fields — add the new field_name to EXPECTED_FIELDS)

5. Update docs/api.md to include the new field in the extractions array schema.

─────────────────────────────────────────────────
## Adding a new risk flag type
─────────────────────────────────────────────────

1. Add the flag_type value to the risk_flags prompt schema in EXTRACTION_PROMPT
   in apps/api/src/tc/services/document_intelligence.py

2. Add the flag_type value to the domain/enums.py RiskFlagType enum
   (if one exists — check the file first)

3. Add a color/icon mapping in:
   apps/web/src/components/RiskFlagPanel.tsx
   The FLAG_TYPE_CONFIG map must include the new type.

4. If the flag requires a real-time deadline monitor rule (not just extraction-time):
   Add the rule to apps/api/src/tc/domain/rules.py
   Add a test to apps/api/src/tc/tests/test_rules.py

5. Add a test fixture to tests/fixtures/extraction_response.json
   and add a test case to test_document_intelligence.py

─────────────────────────────────────────────────
## Schema changes (Supabase)
─────────────────────────────────────────────────

1. Never modify an existing migration file.
   Add a new migration: supabase/migrations/YYYYMMDDHHMMSS_description.sql

2. After adding columns or tables, regenerate TypeScript types:
   cd apps/web && npm run gen:types

3. Update the hand-maintained interfaces in apps/web/src/lib/types.ts
   to use the generated types where applicable (type aliases, not duplication).

4. If new tables are added, add deny-all RLS policies to the migration,
   then add real policies to supabase/migrations/..._rls_policies.sql

5. If RLS policies are changed, add a new migration — do not edit
   the existing policy migration file.

─────────────────────────────────────────────────
## Running the test suite
─────────────────────────────────────────────────

# Full backend test suite
cd apps/api && uv run pytest -v

# With coverage
cd apps/api && uv run pytest --cov=src/tc --cov-report=term-missing

# Single test file
cd apps/api && uv run pytest tests/test_document_intelligence.py -v

# Frontend type check
cd apps/web && npm run tsc --noEmit

# Frontend lint
cd apps/web && npm run lint

No test may call the live Anthropic API.
Use the mock_anthropic fixture from conftest.py for all document intelligence tests.

Commit with message: docs: update CONTRIBUTING.md with extraction field, risk flag, and schema change guides
```

-----

## SECTION F — Infrastructure Verification

-----

### TASK F1 — Audit `infra/docker-compose.yml`

```
Open infra/docker-compose.yml and read it in full.

Verify all of the following. Fix anything that is missing or incorrect.

1. The api service must pass ANTHROPIC_API_KEY from the host environment:
   environment:
     - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
   If this line is missing, the extraction endpoint will fail in Docker
   even if .env is correctly set.

2. The worker service must also pass ANTHROPIC_API_KEY:
   (Workers don't call the API currently, but this keeps the environment
   consistent for future tasks that might)

3. The api service must have a healthcheck:
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   This ensures the worker service waits for the API before starting.

4. The worker service must depend on both api and redis:
   depends_on:
     api:
       condition: service_healthy
     redis:
       condition: service_started

5. The postgres service must have a persistent volume:
   volumes:
     - postgres_data:/var/lib/postgresql/data
   And the volume must be declared at the bottom:
   volumes:
     postgres_data:
   Without this, every docker compose down wipes all seeded data.

6. Verify the postgres service uses PostgreSQL 15:
   image: postgres:15-alpine
   Not postgres:latest — latest changes between environments and
   breaks migrations that rely on pg15 features.

7. The web service must set NEXT_PUBLIC_API_URL correctly for Docker:
   environment:
     - NEXT_PUBLIC_API_URL=http://api:8000
   (Internal Docker network uses service name, not localhost)

After auditing and fixing:
docker compose -f infra/docker-compose.yml config
# Should output the resolved config with no errors or warnings.

docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
# All services should be "healthy" or "running".

Commit with message: fix: ensure docker-compose passes ANTHROPIC_API_KEY and adds postgres persistence
```

-----

### TASK F2 — Audit `scripts/dev.sh`

```
Open scripts/dev.sh and read it in full.

This script is the single command that takes a developer from
a cold clone to a running application. It must do everything.

Verify it does the following steps in order.
Add any that are missing:

#!/usr/bin/env bash
# dev.sh — Start the full Estora development stack.
# Usage: ./scripts/dev.sh
# Usage (skip seed): ./scripts/dev.sh --no-seed

set -euo pipefail

echo "🔧 Checking .env..."
if [[ ! -f .env ]]; then
  echo "Error: .env not found. Copy .env.example to .env and fill in values."
  exit 1
fi

# Check ANTHROPIC_API_KEY is not the placeholder
if grep -q "sk-ant-xxxxxxxxxxxxxxxxxxxx" .env; then
  echo "Error: ANTHROPIC_API_KEY in .env is still the placeholder."
  echo "Get a real key at https://console.anthropic.com/"
  exit 1
fi

echo "🐳 Starting Docker services..."
docker compose -f infra/docker-compose.yml up -d --build

echo "⏳ Waiting for postgres to be ready..."
until docker compose -f infra/docker-compose.yml exec postgres \
    pg_isready -U estora -d estora -q; do
  sleep 1
done

echo "📦 Running database migrations..."
docker compose -f infra/docker-compose.yml exec \
  -w /app/apps/api api \
  uv run alembic upgrade head

if [[ "${1:-}" != "--no-seed" ]]; then
  echo "🌱 Seeding database..."
  docker compose -f infra/docker-compose.yml exec \
    -w /app api \
    uv run python scripts/seed_db.py
fi

echo "✅ Stack is running."
echo ""
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "To stop: docker compose -f infra/docker-compose.yml down"

Verify the script is executable: chmod +x scripts/dev.sh
Run it: ./scripts/dev.sh
Should complete with no errors and print the URLs.

Commit with message: fix: update dev.sh with full startup sequence and env validation
```

-----

### TASK F3 — Audit `scripts/fmt.sh`

```
Open scripts/fmt.sh and read it in full.

This script is referenced in CLAUDE.md as the formatter to run before committing.
It must actually run the formatters.

Verify it contains:

#!/usr/bin/env bash
# fmt.sh — Format all Python and TypeScript code.
# Run before every commit.
# Usage: ./scripts/fmt.sh

set -euo pipefail

echo "🐍 Formatting Python (ruff + black)..."
cd apps/api
uv run ruff check src/ --fix
uv run black src/
cd ../..

echo "🟦 Formatting TypeScript (prettier via eslint)..."
cd apps/web
npm run lint -- --fix
cd ../..

echo "✅ Formatting complete."

If scripts/fmt.sh is missing either the ruff/black or the npm lint step, add it.
Make the script executable: chmod +x scripts/fmt.sh
Run it: ./scripts/fmt.sh
Should complete with no errors.

Commit with message: fix: update fmt.sh to run ruff, black, and eslint --fix
```

-----

## Final Verification Checklist

Run through every item before calling the build complete.

```bash
# A — Configuration
test -f .env.example                                     && echo "✓ .env.example"
test -f apps/web/tailwind.config.ts                      && echo "✓ tailwind.config.ts"
test -f apps/web/next.config.ts                          && echo "✓ next.config.ts"

# B — Supabase
test -f supabase/config.toml                             && echo "✓ supabase/config.toml"
test -f supabase/seed.sql                                && echo "✓ supabase/seed.sql"
test -f supabase/policies.sql                            && echo "✓ supabase/policies.sql"
ls supabase/migrations/*.sql                             && echo "✓ supabase/migrations/"

# C — Test infrastructure
test -f apps/api/src/tc/tests/fixtures/extraction_response.json  && echo "✓ extraction fixture"
test -f apps/api/src/tc/tests/fixtures/minimal_valid.pdf         && echo "✓ minimal PDF"
test -f apps/api/src/tc/tests/fixtures/invalid_not_pdf.pdf       && echo "✓ invalid PDF"
cd apps/api && uv run pytest -v                          && echo "✓ all tests pass"

# D — Frontend
test -f apps/web/src/app/globals.css                     && echo "✓ globals.css"
cd apps/web && npm run tsc --noEmit                      && echo "✓ no TS errors"
grep -q "getToken" apps/web/src/lib/api.ts               && echo "✓ token centralized"

# E — Documentation
test -f DEMO.md                                          && echo "✓ DEMO.md"
test -f docs/decisions/0003-document-intelligence.md     && echo "✓ ADR 0003"
test -f docs/decisions/0004-supabase-rls.md              && echo "✓ ADR 0004"

# F — Infrastructure
grep -q "ANTHROPIC_API_KEY" infra/docker-compose.yml     && echo "✓ API key in compose"
grep -q "postgres_data"     infra/docker-compose.yml     && echo "✓ postgres volume"
./scripts/dev.sh --no-seed                               && echo "✓ dev.sh runs clean"

# Full stack demo loop
# 1. Open http://localhost:3000 — dashboard loads with seeded deals
# 2. Upload a PDF — processing animation plays
# 3. Extraction review renders with fields and risk flags
# 4. Click "Create Transaction" — navigates to transaction detail
# 5. Transaction detail shows timeline, health bar, tasks
# 6. Health bar is vertical, not a donut
# 7. No purple anywhere in the UI
# 8. Font is DM Serif Display / DM Sans / DM Mono
```
