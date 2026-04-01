-- =========================================
-- Migration: contracts.org_id + org-scoped RLS
-- Extends is_contract_party with org membership;
-- consolidates contracts UPDATE policies (security fix);
-- backfills org_id from documents.
-- =========================================

-- 1. Column + index
alter table public.contracts
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create index if not exists ix_contracts_org_id on public.contracts(org_id);

-- 2. Backfill from source document
update public.contracts c
set org_id = d.org_id
from public.documents d
where d.id = c.source_document_id
  and c.org_id is null
  and d.org_id is not null;

-- 3. Backfill from any linked document
update public.contracts c
set org_id = d.org_id
from public.documents d
where d.contract_id = c.id
  and c.org_id is null
  and d.org_id is not null;

-- 4. Extended access: party, admin JWT, or org member
create or replace function public.is_contract_party(p_contract_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.contracts c
    where c.id = p_contract_id
      and (
        c.seller_id              = (auth.jwt() ->> 'person_id')::uuid
        or c.purchaser_id        = (auth.jwt() ->> 'person_id')::uuid
        or c.seller_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
        or c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
        or (auth.jwt() ->> 'app_role') = 'admin'
        or (
          c.org_id is not null
          and c.org_id in (select public.user_org_ids())
        )
      )
  )
$$;

-- 5. contracts SELECT — org members
drop policy if exists "contracts_read_parties" on public.contracts;

create policy "contracts_read_parties"
  on public.contracts for select
  using (
    seller_id              = (auth.jwt() ->> 'person_id')::uuid
    or purchaser_id        = (auth.jwt() ->> 'person_id')::uuid
    or seller_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
    or purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
    or (auth.jwt() ->> 'app_role') = 'admin'
    or (
      org_id is not null
      and org_id in (select public.user_org_ids())
    )
  );

-- 6. people — read parties on org-accessible contracts
drop policy if exists "people_read_contract_parties" on public.people;

create policy "people_read_contract_parties"
  on public.people for select
  using (
    exists (
      select 1 from public.contracts c
      where (
        c.seller_id = id
        or c.purchaser_id = id
        or c.seller_attorney_id = id
        or c.purchaser_attorney_id = id
      )
      and (
        c.seller_id              = (auth.jwt() ->> 'person_id')::uuid
        or c.purchaser_id        = (auth.jwt() ->> 'person_id')::uuid
        or c.seller_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
        or c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
        or (
          c.org_id is not null
          and c.org_id in (select public.user_org_ids())
        )
      )
    )
  );

-- 7. properties — read when linked contract is party or org accessible
drop policy if exists "properties_read_contract_parties" on public.properties;

create policy "properties_read_contract_parties"
  on public.properties for select
  using (
    exists (
      select 1 from public.contracts c
      where c.property_id = id
        and (
          c.seller_id              = (auth.jwt() ->> 'person_id')::uuid
          or c.purchaser_id        = (auth.jwt() ->> 'person_id')::uuid
          or c.seller_attorney_id  = (auth.jwt() ->> 'person_id')::uuid
          or c.purchaser_attorney_id = (auth.jwt() ->> 'person_id')::uuid
          or (
            c.org_id is not null
            and c.org_id in (select public.user_org_ids())
          )
        )
    )
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

-- 8. Consolidate contracts UPDATE: non-terminal + is_contract_party (includes org)
drop policy if exists "contracts_update_non_terminal" on public.contracts;
drop policy if exists "contracts_update_lockdown" on public.contracts;

create policy "contracts_update_non_terminal"
  on public.contracts for update
  using (
    status not in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
    and (
      public.is_contract_party(id)
      or (auth.jwt() ->> 'app_role') = 'admin'
    )
  )
  with check (
    status not in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
  );
