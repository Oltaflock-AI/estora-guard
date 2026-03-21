-- =========================================
-- Migration 003: RLS Policies
-- Drops deny-all defaults, replaces with
-- role-specific access rules.
-- Applied to Supabase 2026-03-21
-- =========================================

-- Helper: get all org IDs the current user belongs to
create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select org_id from public.memberships where user_id = auth.uid()
$$;

-- Helper: check if current user is a party to a contract
create or replace function public.is_contract_party(p_contract_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.contracts c
    where c.id = p_contract_id
      and (
        c.seller_id              = (auth.jwt() ->> 'person_id')::uuid or
        c.purchaser_id           = (auth.jwt() ->> 'person_id')::uuid or
        c.seller_attorney_id     = (auth.jwt() ->> 'person_id')::uuid or
        c.purchaser_attorney_id  = (auth.jwt() ->> 'person_id')::uuid or
        (auth.jwt() ->> 'app_role') = 'admin'
      )
  )
$$;

-- =========================================
-- CONTRACT-CORE TABLES
-- =========================================

-- people
drop policy if exists "deny_all_people" on public.people;

create policy "people_read_own"
  on public.people for select
  using (
    id = (auth.jwt() ->> 'person_id')::uuid
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy "people_read_contract_parties"
  on public.people for select
  using (
    exists (
      select 1 from public.contracts c
      where (
        c.seller_id = id or c.purchaser_id = id or
        c.seller_attorney_id = id or c.purchaser_attorney_id = id
      )
      and (
        c.seller_id              = (auth.jwt() ->> 'person_id')::uuid or
        c.purchaser_id           = (auth.jwt() ->> 'person_id')::uuid or
        c.seller_attorney_id     = (auth.jwt() ->> 'person_id')::uuid or
        c.purchaser_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
      )
    )
  );

create policy "people_insert_service"
  on public.people for insert
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy "people_update_own"
  on public.people for update
  using (
    id = (auth.jwt() ->> 'person_id')::uuid
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

-- properties
drop policy if exists "deny_all_properties" on public.properties;

create policy "properties_read_contract_parties"
  on public.properties for select
  using (
    exists (
      select 1 from public.contracts c
      where c.property_id = id
        and (
          c.seller_id              = (auth.jwt() ->> 'person_id')::uuid or
          c.purchaser_id           = (auth.jwt() ->> 'person_id')::uuid or
          c.seller_attorney_id     = (auth.jwt() ->> 'person_id')::uuid or
          c.purchaser_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
        )
    )
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy "properties_insert_service"
  on public.properties for insert
  with check ((auth.jwt() ->> 'app_role') = 'admin');

-- contracts
drop policy if exists "deny_all_contracts" on public.contracts;

create policy "contracts_read_parties"
  on public.contracts for select
  using (
    seller_id              = (auth.jwt() ->> 'person_id')::uuid or
    purchaser_id           = (auth.jwt() ->> 'person_id')::uuid or
    seller_attorney_id     = (auth.jwt() ->> 'person_id')::uuid or
    purchaser_attorney_id  = (auth.jwt() ->> 'person_id')::uuid or
    (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy "contracts_insert_service"
  on public.contracts for insert
  with check ((auth.jwt() ->> 'app_role') = 'admin');

-- Executed contracts cannot be updated (security.md 3.4)
create policy "contracts_update_non_terminal"
  on public.contracts for update
  using (
    status not in ('closed', 'cancelled')
    and (
      seller_id              = (auth.jwt() ->> 'person_id')::uuid or
      purchaser_id           = (auth.jwt() ->> 'person_id')::uuid or
      seller_attorney_id     = (auth.jwt() ->> 'person_id')::uuid or
      purchaser_attorney_id  = (auth.jwt() ->> 'person_id')::uuid or
      (auth.jwt() ->> 'app_role') = 'admin'
    )
  );

-- contract child tables
drop policy if exists "deny_all_personal_property" on public.contract_personal_property;
drop policy if exists "deny_all_permitted_exceptions" on public.contract_permitted_exceptions;
drop policy if exists "deny_all_violations" on public.contract_violations;
drop policy if exists "deny_all_mortgages" on public.contract_mortgages;
drop policy if exists "deny_all_escrow" on public.contract_escrow;
drop policy if exists "deny_all_closing_conditions" on public.contract_closing_conditions;
drop policy if exists "deny_all_apportionments" on public.contract_apportionments;

create policy "personal_property_read"
  on public.contract_personal_property for select
  using (public.is_contract_party(contract_id));

create policy "personal_property_write"
  on public.contract_personal_property for all
  using (public.is_contract_party(contract_id));

create policy "permitted_exceptions_read"
  on public.contract_permitted_exceptions for select
  using (public.is_contract_party(contract_id));

create policy "violations_read"
  on public.contract_violations for select
  using (public.is_contract_party(contract_id));

create policy "mortgages_read"
  on public.contract_mortgages for select
  using (public.is_contract_party(contract_id));

create policy "escrow_read_parties"
  on public.contract_escrow for select
  using (public.is_contract_party(contract_id));

create policy "escrow_read_assigned_agent"
  on public.contract_escrow for select
  using (escrow_agent_id = (auth.jwt() ->> 'person_id')::uuid);

create policy "closing_conditions_read"
  on public.contract_closing_conditions for select
  using (public.is_contract_party(contract_id));

create policy "closing_conditions_update"
  on public.contract_closing_conditions for update
  using (public.is_contract_party(contract_id));

create policy "apportionments_read"
  on public.contract_apportionments for select
  using (public.is_contract_party(contract_id));

-- =========================================
-- INTELLIGENCE TABLES
-- =========================================

-- profiles
drop policy if exists "deny_all_profiles" on public.profiles;

create policy "profiles_read_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_read_org_members"
  on public.profiles for select
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and m.org_id in (select public.user_org_ids())
    )
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- organizations
drop policy if exists "deny_all_organizations" on public.organizations;

create policy "organizations_read_member"
  on public.organizations for select
  using (id in (select public.user_org_ids()));

create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "organizations_update_admin"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = organizations.id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- memberships
drop policy if exists "deny_all_memberships" on public.memberships;

create policy "memberships_read_own_orgs"
  on public.memberships for select
  using (org_id in (select public.user_org_ids()));

create policy "memberships_insert_admin"
  on public.memberships for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = memberships.org_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- documents
drop policy if exists "deny_all_documents" on public.documents;

create policy "documents_read_org"
  on public.documents for select
  using (org_id in (select public.user_org_ids()));

create policy "documents_insert_org"
  on public.documents for insert
  with check (org_id in (select public.user_org_ids()));

create policy "documents_update_org"
  on public.documents for update
  using (org_id in (select public.user_org_ids()));

-- extractions
drop policy if exists "deny_all_extractions" on public.extractions;

create policy "extractions_read_via_document"
  on public.extractions for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = extractions.document_id
        and d.org_id in (select public.user_org_ids())
    )
  );

create policy "extractions_insert_via_document"
  on public.extractions for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = extractions.document_id
        and d.org_id in (select public.user_org_ids())
    )
  );

-- risk_flags
drop policy if exists "deny_all_risk_flags" on public.risk_flags;

create policy "risk_flags_read_via_document"
  on public.risk_flags for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = risk_flags.document_id
        and d.org_id in (select public.user_org_ids())
    )
  );

create policy "risk_flags_insert_via_document"
  on public.risk_flags for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = risk_flags.document_id
        and d.org_id in (select public.user_org_ids())
    )
  );

create policy "risk_flags_update_acknowledge"
  on public.risk_flags for update
  using (
    exists (
      select 1 from public.documents d
      where d.id = risk_flags.document_id
        and d.org_id in (select public.user_org_ids())
    )
  );

-- tasks
drop policy if exists "deny_all_tasks" on public.tasks;

create policy "tasks_read_contract_party"
  on public.tasks for select
  using (public.is_contract_party(contract_id));

create policy "tasks_insert_contract_party"
  on public.tasks for insert
  with check (public.is_contract_party(contract_id));

create policy "tasks_update_contract_party"
  on public.tasks for update
  using (public.is_contract_party(contract_id));

-- timeline_items
drop policy if exists "deny_all_timeline_items" on public.timeline_items;

create policy "timeline_items_read_contract_party"
  on public.timeline_items for select
  using (public.is_contract_party(contract_id));

create policy "timeline_items_insert_contract_party"
  on public.timeline_items for insert
  with check (public.is_contract_party(contract_id));

create policy "timeline_items_update_contract_party"
  on public.timeline_items for update
  using (public.is_contract_party(contract_id));

-- audit_events (append-only: SELECT only, no UPDATE/DELETE)
drop policy if exists "deny_all_audit_events" on public.audit_events;

create policy "audit_events_read_org"
  on public.audit_events for select
  using (org_id in (select public.user_org_ids()));

-- event_logs
drop policy if exists "deny_all_event_logs" on public.event_logs;

create policy "event_logs_read_contract_party"
  on public.event_logs for select
  using (public.is_contract_party(contract_id));
