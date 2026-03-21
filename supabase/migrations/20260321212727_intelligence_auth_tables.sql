-- =========================================
-- Migration 002: Intelligence & Auth Layer
-- Adds profiles, organizations, memberships,
-- documents, extractions, risk_flags, tasks,
-- timeline_items, audit_events, event_logs.
-- Also adds health_score columns to contracts.
-- Applied to Supabase 2026-03-21
-- =========================================

-- Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  person_id   uuid        references public.people(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Organizations (multi-tenancy boundary)
create table if not exists public.organizations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  slug        text        not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Memberships (user-org join with role)
create table if not exists public.memberships (
  id          uuid        primary key default gen_random_uuid(),
  org_id      uuid        not null references public.organizations(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  role        text        not null default 'agent'
                          check (role in ('agent', 'coordinator', 'broker', 'attorney', 'admin', 'auditor')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint memberships_unique_user_org unique (org_id, user_id)
);

-- Documents (uploaded PDFs)
create table if not exists public.documents (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references public.organizations(id) on delete cascade,
  uploaded_by   uuid        not null references public.profiles(id) on delete restrict,
  contract_id   uuid        references public.contracts(id) on delete set null,
  filename      text        not null,
  storage_path  text        not null,
  doc_type      text        check (doc_type in ('agreement_of_sale', 'disclosure', 'addendum', 'other')),
  raw_text      text,
  summary       text,
  status        text        not null default 'pending'
                            check (status in ('pending', 'processing', 'done', 'failed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Extractions (AI-extracted fields)
create table if not exists public.extractions (
  id            uuid        primary key default gen_random_uuid(),
  document_id   uuid        not null references public.documents(id) on delete cascade,
  field_name    text        not null,
  field_value   text,
  confidence    real        check (confidence >= 0 and confidence <= 1),
  page_ref      integer,
  created_at    timestamptz not null default now()
);

-- Risk Flags (AI-identified risks)
create table if not exists public.risk_flags (
  id                uuid        primary key default gen_random_uuid(),
  document_id       uuid        not null references public.documents(id) on delete cascade,
  flag_type         text        not null
                                check (flag_type in (
                                  'tight_deadline', 'missing_clause', 'unusual_condition',
                                  'unclear_language', 'material_defect'
                                )),
  severity          text        not null
                                check (severity in ('low', 'medium', 'high')),
  title             text        not null,
  explanation       text        not null,
  acknowledged      boolean     not null default false,
  acknowledged_by   uuid        references public.profiles(id) on delete set null,
  acknowledged_at   timestamptz,
  acknowledged_note text,
  created_at        timestamptz not null default now()
);

-- Tasks (action items per contract)
create table if not exists public.tasks (
  id            uuid        primary key default gen_random_uuid(),
  contract_id   uuid        not null references public.contracts(id) on delete cascade,
  title         text        not null,
  description   text,
  status        text        not null default 'todo'
                            check (status in ('todo', 'in_progress', 'done', 'overdue')),
  severity      text        not null default 'medium'
                            check (severity in ('low', 'medium', 'high', 'critical')),
  category      text,
  assignee_id   uuid        references public.profiles(id) on delete set null,
  due_at        timestamptz,
  offset_days   integer,
  dedupe_key    text        unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Timeline Items (milestone markers)
create table if not exists public.timeline_items (
  id              uuid        primary key default gen_random_uuid(),
  contract_id     uuid        not null references public.contracts(id) on delete cascade,
  label           text        not null,
  description     text,
  milestone_type  text,
  due_at          timestamptz,
  completed_at    timestamptz,
  sort_order      integer     not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Audit Events (append-only, no updated_at)
create table if not exists public.audit_events (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references public.organizations(id) on delete cascade,
  actor_id      uuid        references public.profiles(id) on delete set null,
  action        text        not null,
  entity_type   text        not null,
  entity_id     uuid,
  field_name    text,
  old_value     text,
  new_value     text,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

-- Event Logs (machine-readable feed per contract)
create table if not exists public.event_logs (
  id            uuid        primary key default gen_random_uuid(),
  contract_id   uuid        not null references public.contracts(id) on delete cascade,
  event_type    text        not null,
  entity_type   text,
  entity_id     uuid,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

-- Add health columns to contracts
alter table public.contracts
  add column if not exists health_score integer,
  add column if not exists health_status text
    check (health_status in ('green', 'yellow', 'red')),
  add column if not exists source_document_id uuid
    references public.documents(id) on delete set null;

-- Indexes for intelligence layer
create index if not exists ix_documents_org_id on public.documents(org_id);
create index if not exists ix_documents_status on public.documents(status);
create index if not exists ix_documents_contract_id on public.documents(contract_id);
create index if not exists ix_documents_uploaded_by on public.documents(uploaded_by);
create index if not exists ix_extractions_document_id on public.extractions(document_id);
create index if not exists ix_extractions_field_name on public.extractions(field_name);
create index if not exists ix_risk_flags_document_id on public.risk_flags(document_id);
create index if not exists ix_risk_flags_severity on public.risk_flags(severity);
create index if not exists ix_tasks_contract_id on public.tasks(contract_id);
create index if not exists ix_tasks_status on public.tasks(status);
create index if not exists ix_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists ix_tasks_due_at_active on public.tasks(due_at) where status in ('todo', 'in_progress');
create index if not exists ix_timeline_items_contract_id on public.timeline_items(contract_id);
create index if not exists ix_audit_events_org_id on public.audit_events(org_id);
create index if not exists ix_audit_events_entity on public.audit_events(entity_type, entity_id);
create index if not exists ix_audit_events_actor_id on public.audit_events(actor_id);
create index if not exists ix_event_logs_contract_id on public.event_logs(contract_id);
create index if not exists ix_event_logs_event_type on public.event_logs(event_type);
create index if not exists ix_memberships_user_id on public.memberships(user_id);
create index if not exists ix_memberships_org_id on public.memberships(org_id);
create index if not exists ix_profiles_person_id on public.profiles(person_id);
create index if not exists ix_contracts_source_document_id on public.contracts(source_document_id);
create index if not exists ix_contracts_health_status on public.contracts(health_status);

-- RLS: Enable on all new tables with deny-all defaults
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.documents enable row level security;
alter table public.extractions enable row level security;
alter table public.risk_flags enable row level security;
alter table public.tasks enable row level security;
alter table public.timeline_items enable row level security;
alter table public.audit_events enable row level security;
alter table public.event_logs enable row level security;

create policy "deny_all_profiles" on public.profiles for all using (false);
create policy "deny_all_organizations" on public.organizations for all using (false);
create policy "deny_all_memberships" on public.memberships for all using (false);
create policy "deny_all_documents" on public.documents for all using (false);
create policy "deny_all_extractions" on public.extractions for all using (false);
create policy "deny_all_risk_flags" on public.risk_flags for all using (false);
create policy "deny_all_tasks" on public.tasks for all using (false);
create policy "deny_all_timeline_items" on public.timeline_items for all using (false);
create policy "deny_all_audit_events" on public.audit_events for all using (false);
create policy "deny_all_event_logs" on public.event_logs for all using (false);
