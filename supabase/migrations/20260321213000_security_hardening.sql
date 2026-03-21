-- =========================================
-- Migration 009: Security Hardening
-- - Executed agreement lockdown (RLS)
-- - Audit events append-only enforcement
-- - PII redaction helper function
-- Applied to Supabase 2026-03-21
-- =========================================

-- =========================================
-- 1. Executed Agreement Lockdown
-- Block UPDATE on contracts in terminal states
-- =========================================

-- Drop existing update policy if any
drop policy if exists "contracts_update_lockdown" on public.contracts;

-- Allow UPDATE only on non-terminal contracts
-- Terminal = closed, cancelled, defaulted_buyer, defaulted_seller
create policy "contracts_update_lockdown"
  on public.contracts for update
  using (
    status not in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
  )
  with check (
    status not in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
  );

-- Similarly protect child tables of terminal contracts
drop policy if exists "contract_escrow_update_lockdown" on public.contract_escrow;
create policy "contract_escrow_update_lockdown"
  on public.contract_escrow for update
  using (
    not exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.status in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
    )
  );

drop policy if exists "contract_mortgages_update_lockdown" on public.contract_mortgages;
create policy "contract_mortgages_update_lockdown"
  on public.contract_mortgages for update
  using (
    not exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.status in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
    )
  );

drop policy if exists "contract_closing_conditions_update_lockdown" on public.contract_closing_conditions;
create policy "contract_closing_conditions_update_lockdown"
  on public.contract_closing_conditions for update
  using (
    not exists (
      select 1 from public.contracts c
      where c.id = contract_id
        and c.status in ('closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller')
    )
  );

-- =========================================
-- 2. Audit Events: Enforce Append-Only
-- No UPDATE or DELETE ever on audit_events
-- =========================================

-- These policies ensure no row can be updated or deleted
-- even by service role (defense in depth)
drop policy if exists "audit_events_no_update" on public.audit_events;
create policy "audit_events_no_update"
  on public.audit_events for update
  using (false);

drop policy if exists "audit_events_no_delete" on public.audit_events;
create policy "audit_events_no_delete"
  on public.audit_events for delete
  using (false);

-- =========================================
-- 3. PII Redaction Helper
-- Used by audit queries to mask sensitive values
-- =========================================

create or replace function public.redact_pii(val text, field_name text)
returns text
language plpgsql
immutable
as $$
begin
  if field_name in ('masked_tax_id', 'ssn', 'tax_id', 'social_security') then
    if val is null or length(val) < 4 then
      return '***-**-****';
    end if;
    return '***-**-' || right(val, 4);
  end if;

  if field_name in ('email') then
    if val is null then return '***@***.***'; end if;
    declare
      at_pos int := position('@' in val);
    begin
      if at_pos <= 1 then return '***@***.***'; end if;
      return left(val, 1) || '***' || substring(val from at_pos);
    end;
  end if;

  if field_name in ('phone') then
    if val is null or length(val) < 4 then return '(***) ***-****'; end if;
    return '(***) ***-' || right(val, 4);
  end if;

  return val;
end;
$$;
