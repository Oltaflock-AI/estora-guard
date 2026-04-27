-- Audience tagging for buyer-vs-seller filtering on the transaction detail page,
-- and a contract_id column on risk_flags so flags from attached disclosures
-- (LBP, SPD) bubble up to the parent deal.
--
-- Defaults to 'both' so existing rows continue to render in both views with
-- no data backfill required.

alter table public.tasks
  add column audience text not null default 'both'
    check (audience in ('buyer', 'seller', 'both'));

alter table public.timeline_items
  add column audience text not null default 'both'
    check (audience in ('buyer', 'seller', 'both'));

alter table public.risk_flags
  add column audience text not null default 'both'
    check (audience in ('buyer', 'seller', 'both'));

-- Risk flags are inserted against documents today. When a disclosure is
-- attached to an existing transaction, we want its flags surfaced on that
-- transaction's risk panel without re-querying the document join.
alter table public.risk_flags
  add column contract_id uuid references public.contracts(id) on delete cascade;

create index if not exists risk_flags_contract_id_idx
  on public.risk_flags(contract_id);
