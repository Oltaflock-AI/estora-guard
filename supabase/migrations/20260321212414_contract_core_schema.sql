-- =========================================
-- Migration 001: Contract Core Schema
-- NY RESIDENTIAL CONTRACT OF SALE
-- 10 tables, 5 enums, indexes, triggers, RLS
-- Applied to Supabase 2026-03-21
-- =========================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'party_role') then
    create type party_role as enum ('seller', 'purchaser', 'attorney', 'escrow_agent');
  end if;
  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type property_type as enum ('single_family', 'condo', 'co_op', 'townhouse', 'multi_family');
  end if;
  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type contract_status as enum ('draft', 'pending_commitment', 'active', 'cancelled', 'closed', 'defaulted_buyer', 'defaulted_seller');
  end if;
  if not exists (select 1 from pg_type where typname = 'funds_type') then
    create type funds_type as enum ('cash', 'certified_check', 'official_bank_check', 'wire', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'mortgage_kind') then
    create type mortgage_kind as enum ('existing_assumed', 'purchase_money', 'institutional');
  end if;
end $$;

create table if not exists public.people (
  id            uuid          primary key default gen_random_uuid(),
  first_name    text          not null,
  last_name     text          not null,
  email         text          not null,
  phone         text,
  city          text          not null,
  state         text          not null default 'NY',
  postal_code   text,
  is_nyc        boolean       not null default false,
  masked_tax_id text,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),
  constraint people_masked_tax_id_unique unique (masked_tax_id),
  constraint people_state_check check (state = 'NY')
);

create unique index if not exists people_email_unique on public.people (lower(email));

create table if not exists public.properties (
  id                    uuid          primary key default gen_random_uuid(),
  street_1              text          not null,
  street_2              text,
  city                  text          not null,
  state                 text          not null default 'NY',
  postal_code           text          not null,
  county                text          not null,
  property_type         property_type not null,
  bedrooms              int,
  bathrooms             numeric(3,1),
  year_built            int,
  legal_description     text          not null,
  has_public_road_access boolean      not null default true,
  delivered_vacant      boolean       not null default true,
  as_is_sale            boolean       not null default true,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  constraint properties_state_check check (state = 'NY')
);

create unique index if not exists properties_unique_address
  on public.properties (street_1, coalesce(street_2, ''), city, state, postal_code);

create table if not exists public.contracts (
  id                              uuid            primary key default gen_random_uuid(),
  contract_number                 text            not null unique,
  property_id                     uuid            not null references public.properties(id) on delete restrict,
  seller_id                       uuid            not null references public.people(id) on delete restrict,
  purchaser_id                    uuid            not null references public.people(id) on delete restrict,
  seller_attorney_id              uuid            references public.people(id) on delete restrict,
  purchaser_attorney_id           uuid            references public.people(id) on delete restrict,
  status                          contract_status not null default 'draft',
  contract_date                   date            not null,
  closing_date                    date,
  commitment_date                 date,
  purchase_price                  numeric(12,2)   not null check (purchase_price > 0),
  downpayment_amount              numeric(12,2)   not null default 0 check (downpayment_amount >= 0),
  balance_due_at_closing          numeric(12,2)   not null default 0 check (balance_due_at_closing >= 0),
  acceptable_funds                funds_type      not null default 'official_bank_check',
  subject_to_mortgage_contingency boolean         not null default true,
  title_company_name              text,
  schedule_a_legal_description    text,
  seller_has_right_to_sell        boolean         not null default true,
  seller_not_foreign_person       boolean         not null default true,
  no_undisclosed_abatements       boolean         not null default true,
  title_insurable                 boolean         not null default true,
  premises_broom_clean            boolean         not null default true,
  systems_in_working_order        boolean         not null default true,
  smoke_detector_affidavit_required boolean       not null default true,
  certificate_of_occupancy_required boolean       not null default true,
  firpta_cert_required            boolean         not null default true,
  notes                           text,
  created_at                      timestamptz     not null default now(),
  updated_at                      timestamptz     not null default now(),
  constraint contracts_distinct_parties check (seller_id <> purchaser_id),
  constraint contracts_financials_check check (purchase_price >= downpayment_amount and purchase_price >= balance_due_at_closing),
  constraint contracts_terminal_no_closing_date check (status not in ('cancelled', 'defaulted_buyer', 'defaulted_seller') or closing_date is null)
);

create table if not exists public.contract_personal_property (
  id          uuid        primary key default gen_random_uuid(),
  contract_id uuid        not null references public.contracts(id) on delete cascade,
  item_name   text        not null,
  included    boolean     not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint contract_personal_property_unique unique (contract_id, item_name)
);

create table if not exists public.contract_permitted_exceptions (
  id             uuid        primary key default gen_random_uuid(),
  contract_id    uuid        not null references public.contracts(id) on delete cascade,
  exception_name text        not null,
  details        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint contract_permitted_exceptions_unique unique (contract_id, exception_name)
);

create table if not exists public.contract_violations (
  id                          uuid        primary key default gen_random_uuid(),
  contract_id                 uuid        not null references public.contracts(id) on delete cascade,
  violation_type              text        not null,
  issuing_authority           text,
  must_be_cleared_before_closing boolean  not null default true,
  resolved                    boolean     not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table if not exists public.contract_mortgages (
  id                            uuid          primary key default gen_random_uuid(),
  contract_id                   uuid          not null references public.contracts(id) on delete cascade,
  mortgage_type                 mortgage_kind not null,
  lender_name                   text,
  principal_amount              numeric(12,2) not null check (principal_amount >= 0),
  interest_rate                 numeric(5,3)  check (interest_rate >= 0 and interest_rate <= 100),
  monthly_payment               numeric(12,2),
  escrow_required               boolean       not null default false,
  commitment_received           boolean       not null default false,
  commitment_received_date      date,
  subordinate_to_future_financing boolean     not null default false,
  created_at                    timestamptz   not null default now(),
  updated_at                    timestamptz   not null default now()
);

create table if not exists public.contract_escrow (
  id              uuid        primary key default gen_random_uuid(),
  contract_id     uuid        not null unique references public.contracts(id) on delete cascade,
  escrow_agent_id uuid        not null references public.people(id) on delete restrict,
  bank_name       text        not null,
  account_reference text      not null,
  amount_held     numeric(12,2) not null check (amount_held >= 0),
  segregated_account boolean  not null default true,
  dispute_flag    boolean     not null default false,
  release_terms   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.contract_closing_conditions (
  id             uuid        primary key default gen_random_uuid(),
  contract_id    uuid        not null references public.contracts(id) on delete cascade,
  condition_name text        not null,
  is_required    boolean     not null default true,
  is_satisfied   boolean     not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint contract_closing_conditions_unique unique (contract_id, condition_name)
);

create table if not exists public.contract_apportionments (
  id                    uuid        primary key default gen_random_uuid(),
  contract_id           uuid        not null unique references public.contracts(id) on delete cascade,
  prorate_taxes         boolean     not null default true,
  prorate_water         boolean     not null default true,
  prorate_fuel          boolean     not null default true,
  prorate_rents         boolean     not null default false,
  transfer_tax_paid_by  text        not null default 'seller',
  recording_fees_paid_by text       not null default 'purchaser',
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- FK and filter indexes
create index if not exists idx_contracts_property_id on public.contracts(property_id);
create index if not exists idx_contracts_seller_id on public.contracts(seller_id);
create index if not exists idx_contracts_purchaser_id on public.contracts(purchaser_id);
create index if not exists idx_contracts_seller_attorney_id on public.contracts(seller_attorney_id);
create index if not exists idx_contracts_purchaser_attorney_id on public.contracts(purchaser_attorney_id);
create index if not exists idx_contracts_status on public.contracts(status);
create index if not exists idx_contracts_closing_date on public.contracts(closing_date);
create index if not exists idx_contracts_commitment_date on public.contracts(commitment_date);
create index if not exists idx_contract_personal_property_contract_id on public.contract_personal_property(contract_id);
create index if not exists idx_contract_permitted_exceptions_contract_id on public.contract_permitted_exceptions(contract_id);
create index if not exists idx_contract_violations_contract_id on public.contract_violations(contract_id);
create index if not exists idx_contract_mortgages_contract_id on public.contract_mortgages(contract_id);
create index if not exists idx_contract_escrow_escrow_agent_id on public.contract_escrow(escrow_agent_id);
create index if not exists idx_contract_closing_conditions_contract_id on public.contract_closing_conditions(contract_id);
create index if not exists idx_contract_apportionments_contract_id on public.contract_apportionments(contract_id);
create index if not exists idx_people_city on public.people(city);
create index if not exists idx_people_is_nyc on public.people(is_nyc);
create index if not exists idx_properties_city on public.properties(city);
create index if not exists idx_properties_property_type on public.properties(property_type);

-- Updated-at trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers on all tables
drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at before update on public.people for each row execute function public.set_updated_at();

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at before update on public.properties for each row execute function public.set_updated_at();

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_personal_property_updated_at on public.contract_personal_property;
create trigger trg_contract_personal_property_updated_at before update on public.contract_personal_property for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_permitted_exceptions_updated_at on public.contract_permitted_exceptions;
create trigger trg_contract_permitted_exceptions_updated_at before update on public.contract_permitted_exceptions for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_violations_updated_at on public.contract_violations;
create trigger trg_contract_violations_updated_at before update on public.contract_violations for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_mortgages_updated_at on public.contract_mortgages;
create trigger trg_contract_mortgages_updated_at before update on public.contract_mortgages for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_escrow_updated_at on public.contract_escrow;
create trigger trg_contract_escrow_updated_at before update on public.contract_escrow for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_closing_conditions_updated_at on public.contract_closing_conditions;
create trigger trg_contract_closing_conditions_updated_at before update on public.contract_closing_conditions for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_apportionments_updated_at on public.contract_apportionments;
create trigger trg_contract_apportionments_updated_at before update on public.contract_apportionments for each row execute function public.set_updated_at();

-- RLS enabled with deny-all defaults (replaced in migration 003)
alter table public.people enable row level security;
alter table public.properties enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_personal_property enable row level security;
alter table public.contract_permitted_exceptions enable row level security;
alter table public.contract_violations enable row level security;
alter table public.contract_mortgages enable row level security;
alter table public.contract_escrow enable row level security;
alter table public.contract_closing_conditions enable row level security;
alter table public.contract_apportionments enable row level security;

create policy "deny_all_people" on public.people for all using (false);
create policy "deny_all_properties" on public.properties for all using (false);
create policy "deny_all_contracts" on public.contracts for all using (false);
create policy "deny_all_personal_property" on public.contract_personal_property for all using (false);
create policy "deny_all_permitted_exceptions" on public.contract_permitted_exceptions for all using (false);
create policy "deny_all_violations" on public.contract_violations for all using (false);
create policy "deny_all_mortgages" on public.contract_mortgages for all using (false);
create policy "deny_all_escrow" on public.contract_escrow for all using (false);
create policy "deny_all_closing_conditions" on public.contract_closing_conditions for all using (false);
create policy "deny_all_apportionments" on public.contract_apportionments for all using (false);
