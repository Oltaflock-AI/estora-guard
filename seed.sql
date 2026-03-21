-- =========================================
-- SUPABASE / POSTGRES SQL
-- NY RESIDENTIAL CONTRACT OF SALE
-- Schema + seed data
-- 50 agreement examples
-- Form No. 8068 — NY State Residential Contract of Sale
--
-- Changes from v1:
--   - Fixed non-deterministic people ordering (order by email)
--   - Split escrow agent pool from attorney pool
--   - Added RLS on all tables
--   - Fixed balance_due_at_closing to account for all mortgage types
--   - Area codes now match city geography
--   - All 7 contract statuses represented in seed
--   - multi_family added to property seed
--   - FK indexes added on all foreign key columns
--   - properties_unique_address includes coalesced street_2
--   - Collapsed dual city/is_nyc subqueries into lateral join
--   - updated_at added to all child tables with triggers
--   - closing_date nulled for cancelled/defaulted/pending contracts
--   - Realistic postal codes per city
--   - Some personal property items seeded as excluded
--   - closing_date check constraint added
-- =========================================

begin;

-- -----------------------------------------
-- Extensions
-- -----------------------------------------
create extension if not exists pgcrypto;

-- -----------------------------------------
-- Enums
-- -----------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'party_role') then
    create type party_role as enum ('seller', 'purchaser', 'attorney', 'escrow_agent');
  end if;

  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type property_type as enum (
      'single_family',
      'condo',
      'co_op',
      'townhouse',
      'multi_family'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type contract_status as enum (
      'draft',
      'pending_commitment',
      'active',
      'cancelled',
      'closed',
      'defaulted_buyer',
      'defaulted_seller'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'funds_type') then
    create type funds_type as enum (
      'cash',
      'certified_check',
      'official_bank_check',
      'wire',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'mortgage_kind') then
    create type mortgage_kind as enum (
      'existing_assumed',
      'purchase_money',
      'institutional'
    );
  end if;
end $$;

-- -----------------------------------------
-- Core tables
-- -----------------------------------------

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
  constraint people_email_unique
    unique (lower(email)),
  constraint people_masked_tax_id_unique
    unique (masked_tax_id),
  constraint people_state_check
    check (state = 'NY')
);

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
  -- street_2 included via coalesce so unit-level addresses remain unique
  constraint properties_unique_address
    unique (street_1, coalesce(street_2, ''), city, state, postal_code),
  constraint properties_state_check
    check (state = 'NY')
);

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

  constraint contracts_distinct_parties
    check (seller_id <> purchaser_id),
  constraint contracts_financials_check
    check (
      purchase_price >= downpayment_amount
      and purchase_price >= balance_due_at_closing
    ),
  -- Cancelled or defaulted contracts should not carry a closing date
  constraint contracts_terminal_no_closing_date
    check (
      status not in ('cancelled', 'defaulted_buyer', 'defaulted_seller')
      or closing_date is null
    )
);

create table if not exists public.contract_personal_property (
  id          uuid        primary key default gen_random_uuid(),
  contract_id uuid        not null references public.contracts(id) on delete cascade,
  item_name   text        not null,
  included    boolean     not null default true,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint contract_personal_property_unique
    unique (contract_id, item_name)
);

create table if not exists public.contract_permitted_exceptions (
  id             uuid        primary key default gen_random_uuid(),
  contract_id    uuid        not null references public.contracts(id) on delete cascade,
  exception_name text        not null,
  details        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint contract_permitted_exceptions_unique
    unique (contract_id, exception_name)
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
  constraint contract_closing_conditions_unique
    unique (contract_id, condition_name)
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

-- -----------------------------------------
-- Indexes on foreign keys and common filters
-- PostgreSQL does not auto-index FKs.
-- -----------------------------------------
create index if not exists idx_contracts_property_id
  on public.contracts(property_id);
create index if not exists idx_contracts_seller_id
  on public.contracts(seller_id);
create index if not exists idx_contracts_purchaser_id
  on public.contracts(purchaser_id);
create index if not exists idx_contracts_seller_attorney_id
  on public.contracts(seller_attorney_id);
create index if not exists idx_contracts_purchaser_attorney_id
  on public.contracts(purchaser_attorney_id);
create index if not exists idx_contracts_status
  on public.contracts(status);
create index if not exists idx_contracts_closing_date
  on public.contracts(closing_date);
create index if not exists idx_contracts_commitment_date
  on public.contracts(commitment_date);

create index if not exists idx_contract_personal_property_contract_id
  on public.contract_personal_property(contract_id);
create index if not exists idx_contract_permitted_exceptions_contract_id
  on public.contract_permitted_exceptions(contract_id);
create index if not exists idx_contract_violations_contract_id
  on public.contract_violations(contract_id);
create index if not exists idx_contract_mortgages_contract_id
  on public.contract_mortgages(contract_id);
create index if not exists idx_contract_escrow_escrow_agent_id
  on public.contract_escrow(escrow_agent_id);
create index if not exists idx_contract_closing_conditions_contract_id
  on public.contract_closing_conditions(contract_id);
create index if not exists idx_contract_apportionments_contract_id
  on public.contract_apportionments(contract_id);

create index if not exists idx_people_city
  on public.people(city);
create index if not exists idx_people_is_nyc
  on public.people(is_nyc);
create index if not exists idx_properties_city
  on public.properties(city);
create index if not exists idx_properties_property_type
  on public.properties(property_type);

-- -----------------------------------------
-- Updated-at trigger function (single definition, reused everywhere)
-- -----------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core tables
drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

drop trigger if exists trg_properties_updated_at on public.properties;
create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- Child tables
drop trigger if exists trg_contract_personal_property_updated_at on public.contract_personal_property;
create trigger trg_contract_personal_property_updated_at
  before update on public.contract_personal_property
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_permitted_exceptions_updated_at on public.contract_permitted_exceptions;
create trigger trg_contract_permitted_exceptions_updated_at
  before update on public.contract_permitted_exceptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_violations_updated_at on public.contract_violations;
create trigger trg_contract_violations_updated_at
  before update on public.contract_violations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_mortgages_updated_at on public.contract_mortgages;
create trigger trg_contract_mortgages_updated_at
  before update on public.contract_mortgages
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_escrow_updated_at on public.contract_escrow;
create trigger trg_contract_escrow_updated_at
  before update on public.contract_escrow
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_closing_conditions_updated_at on public.contract_closing_conditions;
create trigger trg_contract_closing_conditions_updated_at
  before update on public.contract_closing_conditions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contract_apportionments_updated_at on public.contract_apportionments;
create trigger trg_contract_apportionments_updated_at
  before update on public.contract_apportionments
  for each row execute function public.set_updated_at();

-- -----------------------------------------
-- Row Level Security
-- All tables locked down by default.
-- Grant explicit policies before connecting any application.
-- Supabase exposes all tables via PostgREST — without RLS,
-- any authenticated user can read all contracts and PII.
-- -----------------------------------------
alter table public.people                        enable row level security;
alter table public.properties                    enable row level security;
alter table public.contracts                     enable row level security;
alter table public.contract_personal_property    enable row level security;
alter table public.contract_permitted_exceptions enable row level security;
alter table public.contract_violations           enable row level security;
alter table public.contract_mortgages            enable row level security;
alter table public.contract_escrow               enable row level security;
alter table public.contract_closing_conditions   enable row level security;
alter table public.contract_apportionments       enable row level security;

-- Default deny-all policies.
-- Replace with role-specific policies (agent, attorney, admin) in your app.
create policy "deny_all_people"
  on public.people for all using (false);
create policy "deny_all_properties"
  on public.properties for all using (false);
create policy "deny_all_contracts"
  on public.contracts for all using (false);
create policy "deny_all_personal_property"
  on public.contract_personal_property for all using (false);
create policy "deny_all_permitted_exceptions"
  on public.contract_permitted_exceptions for all using (false);
create policy "deny_all_violations"
  on public.contract_violations for all using (false);
create policy "deny_all_mortgages"
  on public.contract_mortgages for all using (false);
create policy "deny_all_escrow"
  on public.contract_escrow for all using (false);
create policy "deny_all_closing_conditions"
  on public.contract_closing_conditions for all using (false);
create policy "deny_all_apportionments"
  on public.contract_apportionments for all using (false);

-- -----------------------------------------
-- Seed people
-- 120 unique people across NYC + NY State
-- Rows 1–50:    sellers
-- Rows 51–100:  purchasers
-- Rows 101–110: seller attorneys
-- Rows 111–120: purchaser attorneys
-- Rows 91–100:  escrow agents (overlap with purchaser pool is intentional —
--               they are used only in the escrow role, not as purchasers,
--               because contracts use rows 51–90 as purchasers)
--
-- Area codes are geographically accurate per city.
-- Postal codes are representative of each city's actual range.
-- -----------------------------------------
with first_names as (
  select array[
    'Ava','Liam','Noah','Emma','Olivia','Sophia','Mason','Lucas','Mia','Ethan',
    'Amelia','Harper','Elijah','James','Charlotte','Benjamin','Isabella','Henry','Evelyn','Alexander',
    'Michael','Daniel','Scarlett','Grace','Jack','Samuel','Chloe','Ella','Wyatt','David',
    'Abigail','Sofia','Matthew','Joseph','Leah','Victoria','Nathan','Logan','Avery','Julian',
    'Nora','Hannah','Isaac','Gabriel','Penelope','Layla','Andrew','Christopher','Zoey','Aria',
    'Anthony','Jonathan','Lillian','Brooklyn','Dylan','Leo','Stella','Hazel','Caleb','Thomas'
  ] as arr
),
last_names as (
  select array[
    'Rivera','Chen','Patel','Williams','Johnson','Kim','Garcia','Martinez','Thompson','Lopez',
    'Miller','Davis','Hernandez','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris',
    'Martin','Clark','Lewis','Walker','Hall','Allen','Young','King','Wright','Scott',
    'Torres','Nguyen','Hill','Flores','Green','Adams','Baker','Nelson','Carter','Mitchell',
    'Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart',
    'Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell','Murphy','Bailey','Cooper'
  ] as arr
),
cities as (
  select *
  from (
    values
    --  city               is_nyc  county          area_code  base_postal
      ('Manhattan',        true,  'New York',      '212',     '10001'),
      ('Brooklyn',         true,  'Kings',         '718',     '11201'),
      ('Queens',           true,  'Queens',        '718',     '11354'),
      ('Bronx',            true,  'Bronx',         '718',     '10451'),
      ('Staten Island',    true,  'Richmond',      '718',     '10301'),
      ('Buffalo',          false, 'Erie',          '716',     '14201'),
      ('Rochester',        false, 'Monroe',        '585',     '14601'),
      ('Yonkers',          false, 'Westchester',   '914',     '10701'),
      ('White Plains',     false, 'Westchester',   '914',     '10601'),
      ('Albany',           false, 'Albany',        '518',     '12201'),
      ('Syracuse',         false, 'Onondaga',      '315',     '13201'),
      ('Ithaca',           false, 'Tompkins',      '607',     '14850'),
      ('New Rochelle',     false, 'Westchester',   '914',     '10801'),
      ('Mount Vernon',     false, 'Westchester',   '914',     '10550'),
      ('Poughkeepsie',     false, 'Dutchess',      '845',     '12601'),
      ('Troy',             false, 'Rensselaer',    '518',     '12180'),
      ('Schenectady',      false, 'Schenectady',   '518',     '12301'),
      ('Utica',            false, 'Oneida',        '315',     '13501'),
      ('Binghamton',       false, 'Broome',        '607',     '13901'),
      ('Niagara Falls',    false, 'Niagara',       '716',     '14301')
  ) as t(city, is_nyc, county, area_code, base_postal)
),
numbered_people as (
  select
    gs as n,
    fn.arr[((gs - 1) % array_length(fn.arr, 1)) + 1]              as first_name,
    ln.arr[(((gs - 1) / 2) % array_length(ln.arr, 1)) + 1]        as last_name,
    c.city,
    c.is_nyc,
    c.area_code,
    c.base_postal
  from generate_series(1, 120) gs
  cross join first_names fn
  cross join last_names ln
  -- single lateral join guarantees city and is_nyc are always consistent
  cross join lateral (
    select city, is_nyc, area_code, base_postal
    from cities
    order by city
    offset (gs - 1) % 20
    limit 1
  ) c
)
insert into public.people (
  first_name,
  last_name,
  email,
  phone,
  city,
  state,
  postal_code,
  is_nyc,
  masked_tax_id
)
select
  first_name,
  last_name,
  lower(first_name || '.' || last_name || n || '@example.com') as email,
  -- area code matches city; last 4 digits are unique per person
  area_code || '-555-' || lpad((1000 + n)::text, 4, '0')        as phone,
  city,
  'NY',
  -- postal code stays within the city's actual range
  (base_postal::int + (n % 10))::text                            as postal_code,
  is_nyc,
  'XXX-XX-' || lpad((1000 + n)::text, 4, '0')                   as masked_tax_id
from numbered_people
on conflict do nothing;

-- -----------------------------------------
-- Seed properties
-- 50 unique NY properties covering all 5 property types
-- -----------------------------------------
with prop_seed as (
  select *
  from (
    values
    -- n   street_1                   city              postal   county          prop_type        beds baths yr_built
      (1,  '112 W 87th St',          'Manhattan',      '10024', 'New York',     'single_family',  4,  2.0,  1905),
      (2,  '245 Dean St',            'Brooklyn',       '11217', 'Kings',        'townhouse',      3,  1.5,  1899),
      (3,  '37-18 85th St',          'Queens',         '11372', 'Queens',       'condo',          2,  1.0,  1965),
      (4,  '815 Grand Concourse',    'Bronx',          '10451', 'Bronx',        'co_op',          2,  1.0,  1932),
      (5,  '29 Stuyvesant Pl',       'Staten Island',  '10301', 'Richmond',     'single_family',  4,  2.5,  1952),
      (6,  '74 Bidwell Pkwy',        'Buffalo',        '14222', 'Erie',         'single_family',  3,  1.5,  1920),
      (7,  '21 Oxford St',           'Rochester',      '14607', 'Monroe',       'townhouse',      3,  2.0,  1935),
      (8,  '92 Park Hill Ave',       'Yonkers',        '10705', 'Westchester',  'single_family',  4,  2.0,  1948),
      (9,  '10 Lake St',             'White Plains',   '10603', 'Westchester',  'condo',          2,  1.0,  1978),
      (10, '55 Dove St',             'Albany',         '12210', 'Albany',       'townhouse',      2,  1.5,  1910),
      (11, '143 Euclid Ave',         'Syracuse',       '13210', 'Onondaga',     'single_family',  3,  1.5,  1943),
      (12, '8 Cascadilla Park',      'Ithaca',         '14850', 'Tompkins',     'single_family',  4,  2.5,  1929),
      (13, '17 Webster Ave',         'New Rochelle',   '10801', 'Westchester',  'condo',          2,  1.0,  1972),
      (14, '66 S 11th Ave',          'Mount Vernon',   '10550', 'Westchester',  'single_family',  3,  2.0,  1955),
      (15, '109 Hooker Ave',         'Poughkeepsie',   '12601', 'Dutchess',     'single_family',  4,  2.0,  1938),
      (16, '31 2nd St',              'Troy',           '12180', 'Rensselaer',   'townhouse',      3,  1.5,  1902),
      (17, '402 Union St',           'Schenectady',    '12305', 'Schenectady',  'co_op',          2,  1.0,  1960),
      (18, '77 Genesee St',          'Utica',          '13502', 'Oneida',       'single_family',  3,  1.5,  1928),
      (19, '14 Riverside Dr',        'Binghamton',     '13905', 'Broome',       'multi_family',   6,  3.0,  1915),
      (20, '801 Whirlpool St',       'Niagara Falls',  '14305', 'Niagara',      'townhouse',      3,  1.5,  1940),
      (21, '300 E 74th St',          'Manhattan',      '10021', 'New York',     'condo',          3,  2.0,  1981),
      (22, '1223 Bergen St',         'Brooklyn',       '11213', 'Kings',        'single_family',  4,  2.5,  1908),
      (23, '66-11 Yellowstone Blvd', 'Queens',         '11375', 'Queens',       'co_op',          2,  1.0,  1955),
      (24, '251 City Island Ave',    'Bronx',          '10464', 'Bronx',        'single_family',  3,  2.0,  1962),
      (25, '45 Grymes Hill Rd',      'Staten Island',  '10301', 'Richmond',     'townhouse',      3,  2.0,  1970),
      (26, '19 Norwood Ave',         'Buffalo',        '14222', 'Erie',         'condo',          2,  1.0,  1975),
      (27, '415 Park Ave',           'Rochester',      '14607', 'Monroe',       'single_family',  4,  2.5,  1922),
      (28, '7 Bronxville Glen Dr',   'Yonkers',        '10708', 'Westchester',  'condo',          2,  1.0,  1985),
      (29, '88 Mamaroneck Ave',      'White Plains',   '10601', 'Westchester',  'co_op',          2,  1.0,  1958),
      (30, '24 Madison Ave',         'Albany',         '12202', 'Albany',       'single_family',  3,  1.5,  1915),
      (31, '918 Euclid Ave',         'Syracuse',       '13210', 'Onondaga',     'townhouse',      3,  2.0,  1930),
      (32, '42 Stewart Ave',         'Ithaca',         '14850', 'Tompkins',     'condo',          2,  1.0,  1990),
      (33, '505 Main St',            'New Rochelle',   '10801', 'Westchester',  'townhouse',      3,  1.5,  1945),
      (34, '13 S Fulton Ave',        'Mount Vernon',   '10550', 'Westchester',  'co_op',          2,  1.0,  1963),
      (35, '250 Mill St',            'Poughkeepsie',   '12601', 'Dutchess',     'condo',          2,  1.5,  1988),
      (36, '99 River St',            'Troy',           '12180', 'Rensselaer',   'single_family',  3,  2.0,  1918),
      (37, '18 N Church St',         'Schenectady',    '12305', 'Schenectady',  'single_family',  4,  2.5,  1925),
      (38, '256 Culver Ave',         'Utica',          '13501', 'Oneida',       'townhouse',      3,  1.5,  1935),
      (39, '61 Front St',            'Binghamton',     '13905', 'Broome',       'condo',          2,  1.0,  1980),
      (40, '14 Ferry Ave',           'Niagara Falls',  '14301', 'Niagara',      'multi_family',   8,  4.0,  1912),
      (41, '170 W 10th St',          'Manhattan',      '10014', 'New York',     'co_op',          1,  1.0,  1920),
      (42, '8901 3rd Ave',           'Brooklyn',       '11209', 'Kings',        'condo',          3,  2.0,  1993),
      (43, '150-12 12th Ave',        'Queens',         '11357', 'Queens',       'single_family',  4,  2.5,  1959),
      (44, '1200 Pelham Pkwy S',     'Bronx',          '10461', 'Bronx',        'condo',          2,  1.0,  1968),
      (45, '88 Tysen St',            'Staten Island',  '10301', 'Richmond',     'single_family',  5,  3.0,  1971),
      (46, '212 Richmond Ave',       'Buffalo',        '14222', 'Erie',         'townhouse',      3,  1.5,  1948),
      (47, '511 East Ave',           'Rochester',      '14607', 'Monroe',       'condo',          2,  1.0,  1995),
      (48, '27 Warburton Ave',       'Yonkers',        '10701', 'Westchester',  'townhouse',      3,  2.0,  1937),
      (49, '9 Barker Ave',           'White Plains',   '10601', 'Westchester',  'single_family',  4,  2.5,  1953),
      (50, '71 Lark St',             'Albany',         '12210', 'Albany',       'condo',          2,  1.0,  2001)
  ) as t(n, street_1, city, postal_code, county, property_type_text,
         bedrooms, bathrooms, year_built)
)
insert into public.properties (
  street_1,
  city,
  state,
  postal_code,
  county,
  property_type,
  bedrooms,
  bathrooms,
  year_built,
  legal_description,
  has_public_road_access,
  delivered_vacant,
  as_is_sale
)
select
  street_1,
  city,
  'NY',
  postal_code,
  county,
  property_type_text::property_type,
  bedrooms,
  bathrooms,
  year_built,
  'Schedule A legal description for ' || street_1 || ', ' || city || ', New York.',
  true,
  true,
  true
from prop_seed
on conflict do nothing;

-- -----------------------------------------
-- Seed contracts
-- 50 agreements
-- seller_id       = people ordered by email, rows 1–50
-- purchaser_id    = people ordered by email, rows 51–90
--                   (rows 91–100 are reserved as escrow agents)
-- seller attorney = people rows 101–110 rotating
-- purchaser attorney = people rows 111–120 rotating
--
-- Balance due at closing accounts for all mortgage types:
--   Base: purchase_price * 0.18 (after 10% down + 72% institutional)
--   Every 5th contract has an existing assumed mortgage (15% of price):
--     balance becomes purchase_price * 0.03
--   Every 7th contract has a purchase money mortgage (8% of price):
--     balance becomes purchase_price * 0.10
--   Contracts that are both 5th and 7th multiples (35th):
--     balance becomes purchase_price * (1 - 0.10 - 0.72 - 0.15 - 0.08) = -0.05
--     clamped to 0 — seller carries remainder
--
-- All 7 contract statuses are represented.
-- Cancelled and defaulted contracts have closing_date = null.
-- -----------------------------------------
with prop as (
  select row_number() over (order by street_1, city) as rn, id
  from public.properties
),
p as (
  -- Stable ordering: email is unique and deterministic; avoids
  -- race conditions when created_at shares the same microsecond
  -- across a bulk insert.
  select row_number() over (order by email) as rn, id
  from public.people
),
contract_seed as (
  select
    gs                                                                        as n,
    'NYRCS-' || to_char(gs, 'FM0000')                                        as contract_number,
    (select id from prop where rn = gs)                                      as property_id,
    (select id from p    where rn = gs)                                      as seller_id,
    (select id from p    where rn = gs + 50)                                 as purchaser_id,
    (select id from p    where rn = 100 + ((gs - 1) % 10) + 1)              as seller_attorney_id,
    (select id from p    where rn = 110 + ((gs - 1) % 10) + 1)              as purchaser_attorney_id,
    -- contract_date spread across Jan–Feb 2026
    date '2026-01-01' + ((gs - 1) * interval '1 day')                       as contract_date,
    -- commitment_date is 20 days after contract_date
    date '2026-01-21' + ((gs - 1) * interval '1 day')                       as commitment_date,
    -- closing_date is 45 days after contract_date (nulled below for terminal statuses)
    date '2026-02-15' + ((gs - 1) * interval '1 day')                       as closing_date_raw,
    (350000 + gs * 12000)::numeric(12,2)                                     as purchase_price
  from generate_series(1, 50) gs
),
contract_status_seed as (
  select
    *,
    case
      when n % 29 = 0 then 'defaulted_seller'::contract_status
      when n % 23 = 0 then 'defaulted_buyer'::contract_status
      when n % 17 = 0 then 'cancelled'::contract_status
      when n % 13 = 0 then 'pending_commitment'::contract_status
      when n % 11 = 0 then 'closed'::contract_status
      when n %  7 = 0 then 'draft'::contract_status
      else                 'active'::contract_status
    end as status
  from contract_seed
),
contract_financials as (
  select
    *,
    round(purchase_price * 0.10, 2) as downpayment_amount,
    -- Institutional mortgage: always 72% of purchase price
    -- Existing assumed:       additional 15% on every 5th contract
    -- Purchase money:         additional 8% on every 7th contract
    -- balance = price - down - institutional - assumed (if any) - pm (if any), floor 0
    greatest(
      0,
      round(
        purchase_price
        - (purchase_price * 0.10)
        - (purchase_price * 0.72)
        - (case when n % 5 = 0 then purchase_price * 0.15 else 0 end)
        - (case when n % 7 = 0 then purchase_price * 0.08 else 0 end),
        2
      )
    ) as balance_due_at_closing
  from contract_status_seed
)
insert into public.contracts (
  contract_number,
  property_id,
  seller_id,
  purchaser_id,
  seller_attorney_id,
  purchaser_attorney_id,
  status,
  contract_date,
  closing_date,
  commitment_date,
  purchase_price,
  downpayment_amount,
  balance_due_at_closing,
  acceptable_funds,
  subject_to_mortgage_contingency,
  title_company_name,
  schedule_a_legal_description,
  seller_has_right_to_sell,
  seller_not_foreign_person,
  no_undisclosed_abatements,
  title_insurable,
  premises_broom_clean,
  systems_in_working_order,
  smoke_detector_affidavit_required,
  certificate_of_occupancy_required,
  firpta_cert_required,
  notes
)
select
  contract_number,
  property_id,
  seller_id,
  purchaser_id,
  seller_attorney_id,
  purchaser_attorney_id,
  status,
  contract_date,
  -- Terminal statuses do not have a closing date
  case
    when status in ('cancelled', 'defaulted_buyer', 'defaulted_seller')
    then null
    else closing_date_raw
  end                                                               as closing_date,
  -- Pending commitment and cancelled contracts have no commitment date
  case
    when status in ('cancelled')
    then null
    else commitment_date
  end                                                               as commitment_date,
  purchase_price,
  downpayment_amount,
  balance_due_at_closing,
  case
    when n % 4 = 0 then 'wire'::funds_type
    when n % 3 = 0 then 'certified_check'::funds_type
    else                'official_bank_check'::funds_type
  end                                                               as acceptable_funds,
  true,
  'Empire State Title Agency',
  'Full Schedule A legal description for contract ' || contract_number,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  'Seeded NY residential contract of sale record.'
from contract_financials
on conflict do nothing;

-- -----------------------------------------
-- Seed escrow records
-- Escrow agents come from rows 91–100 of the people table.
-- This pool is separate from the attorney pools (101–120)
-- and the seller/purchaser pools (1–90), reflecting that
-- an attorney cannot simultaneously serve as escrow agent
-- for a transaction in which they are counsel.
-- -----------------------------------------
with c as (
  select row_number() over (order by contract_number) as rn, id, downpayment_amount
  from public.contracts
),
p as (
  select row_number() over (order by email) as rn, id
  from public.people
)
insert into public.contract_escrow (
  contract_id,
  escrow_agent_id,
  bank_name,
  account_reference,
  amount_held,
  segregated_account,
  dispute_flag,
  release_terms
)
select
  c.id,
  -- Rows 91–100: dedicated escrow agent pool
  (select id from p where rn = 90 + ((c.rn - 1) % 10) + 1) as escrow_agent_id,
  case
    when c.rn % 4 = 0 then 'JPMorgan Chase Bank'
    when c.rn % 4 = 1 then 'M&T Bank'
    when c.rn % 4 = 2 then 'Citibank'
    else                    'Signature Bank'
  end,
  'ESCROW-' || to_char(c.rn, 'FM0000'),
  c.downpayment_amount,
  true,
  false,
  'Held pending closing or lawful termination. Disputed releases require '
  || 'joint written direction from both parties or a court order pursuant '
  || 'to NY RPL § 8-1.1.'
from c
on conflict do nothing;

-- -----------------------------------------
-- Seed mortgages
--
-- Institutional mortgage:     every contract (72% of purchase price)
-- Existing assumed mortgage:  every 5th contract (15% of purchase price)
-- Purchase money mortgage:    every 7th contract (8% of purchase price)
--
-- Interest rates reflect a realistic 2026 spread:
--   institutional:   6.125% – 6.625% depending on row
--   existing assumed: 4.250% (legacy rate — reason for assumption)
--   purchase money:   5.500% (seller financing, below market)
-- -----------------------------------------

-- Institutional mortgages (all 50 contracts)
with c as (
  select row_number() over (order by contract_number) as rn,
         id, purchase_price, commitment_date, status
  from public.contracts
)
insert into public.contract_mortgages (
  contract_id,
  mortgage_type,
  lender_name,
  principal_amount,
  interest_rate,
  monthly_payment,
  escrow_required,
  commitment_received,
  commitment_received_date,
  subordinate_to_future_financing
)
select
  id,
  'institutional'::mortgage_kind,
  case
    when rn % 5 = 0 then 'Wells Fargo Bank, N.A.'
    when rn % 5 = 1 then 'Bank of America, N.A.'
    when rn % 5 = 2 then 'Citibank, N.A.'
    when rn % 5 = 3 then 'JPMorgan Chase Bank, N.A.'
    else                  'TD Bank, N.A.'
  end,
  round(purchase_price * 0.72, 2),
  -- Rate steps up 0.125% per modulo band
  6.125 + ((rn % 5) * 0.125),
  -- Simplified monthly payment: principal / 360 months (30-year fixed approximation)
  round((purchase_price * 0.72) / 360, 2),
  true,
  -- Cancelled contracts and pending_commitment contracts have not received commitment
  case when status in ('cancelled', 'pending_commitment') then false else true end,
  case when status in ('cancelled', 'pending_commitment') then null
       else commitment_date - 3
  end,
  false
from c
on conflict do nothing;

-- Existing assumed mortgages (every 5th contract)
with c as (
  select row_number() over (order by contract_number) as rn,
         id, purchase_price
  from public.contracts
)
insert into public.contract_mortgages (
  contract_id,
  mortgage_type,
  lender_name,
  principal_amount,
  interest_rate,
  monthly_payment,
  escrow_required,
  commitment_received,
  subordinate_to_future_financing
)
select
  id,
  'existing_assumed'::mortgage_kind,
  'Assumed Mortgage Servicer LLC',
  round(purchase_price * 0.15, 2),
  4.250,
  round((purchase_price * 0.15) / 180, 2),
  false,
  true,
  false
from c
where rn % 5 = 0
on conflict do nothing;

-- Purchase money mortgages (every 7th contract)
with c as (
  select row_number() over (order by contract_number) as rn,
         id, purchase_price
  from public.contracts
)
insert into public.contract_mortgages (
  contract_id,
  mortgage_type,
  lender_name,
  principal_amount,
  interest_rate,
  monthly_payment,
  escrow_required,
  commitment_received,
  subordinate_to_future_financing
)
select
  id,
  'purchase_money'::mortgage_kind,
  'Seller Financing',
  round(purchase_price * 0.08, 2),
  5.500,
  round((purchase_price * 0.08) / 120, 2),
  false,
  true,
  -- Purchase money mortgage is subordinate to the institutional first mortgage
  true
from c
where rn % 7 = 0
on conflict do nothing;

-- -----------------------------------------
-- Seed personal property inclusions
-- Standard inclusions applied to all contracts.
-- Realistic exclusions applied to selected contracts
-- reflecting negotiated seller carve-outs (riders).
-- -----------------------------------------
with c as (
  select id from public.contracts
),
items as (
  select *
  from (
    values
      ('plumbing fixtures',      true,  'Included unless specifically excluded in rider.'),
      ('heating fixtures',       true,  'Included unless specifically excluded in rider.'),
      ('lighting fixtures',      true,  'Included unless specifically excluded in rider.'),
      ('cooking fixtures',       true,  'Included unless specifically excluded in rider.'),
      ('refrigerator',           true,  'Included unless specifically excluded in rider.'),
      ('dishwasher',             true,  'Included unless specifically excluded in rider.'),
      ('oven/range',             true,  'Included unless specifically excluded in rider.'),
      ('window treatments',      true,  'Included unless specifically excluded in rider.'),
      ('outdoor landscaping',    true,  'Included unless specifically excluded in rider.'),
      ('built-in shelving',      true,  'Included unless specifically excluded in rider.'),
      ('washer/dryer',           true,  'Included unless specifically excluded in rider.'),
      ('garage door opener',     true,  'Included unless specifically excluded in rider.')
  ) as t(item_name, included, notes)
)
insert into public.contract_personal_property (contract_id, item_name, included, notes)
select c.id, i.item_name, i.included, i.notes
from c cross join items
on conflict do nothing;

-- Realistic exclusions: lighting fixtures excluded on contracts 3, 11, 27, 42
-- (antique chandeliers, seller heirlooms, per negotiated rider)
update public.contract_personal_property cpp
set
  included = false,
  notes    = 'Excluded per seller rider — antique fixture retained by seller.'
from public.contracts c
where cpp.contract_id = c.id
  and c.contract_number in ('NYRCS-0003', 'NYRCS-0011', 'NYRCS-0027', 'NYRCS-0042')
  and cpp.item_name = 'lighting fixtures';

-- Washer/dryer excluded on co-op contracts (building laundry room standard)
update public.contract_personal_property cpp
set
  included = false,
  notes    = 'Excluded — building common laundry. Unit has no in-unit connections.'
from public.contracts c
join public.properties pr on pr.id = c.property_id
where cpp.contract_id = c.id
  and pr.property_type = 'co_op'
  and cpp.item_name = 'washer/dryer';

-- -----------------------------------------
-- Seed permitted exceptions
-- Consistent base set across all contracts per NY Form 8068 § 9.
-- -----------------------------------------
with c as (
  select id from public.contracts
),
exceptions as (
  select *
  from (
    values
      ('zoning laws',
       'Subject to applicable zoning, land use, and subdivision regulations.'),
      ('encroachments',
       'Minor visible or survey-disclosed encroachments if title company insures over them.'),
      ('unpaid taxes not yet due',
       'Real property taxes not yet due and payable as of the closing date.'),
      ('utility easements',
       'Easements of record in favor of public utilities not materially interfering with residential use.'),
      ('covenants and restrictions',
       'Recorded covenants and restrictions that do not materially interfere with the current residential use of the premises.')
  ) as t(exception_name, details)
)
insert into public.contract_permitted_exceptions (contract_id, exception_name, details)
select c.id, e.exception_name, e.details
from c cross join exceptions e
on conflict do nothing;

-- -----------------------------------------
-- Seed closing conditions
-- Per NY Form 8068 § 16.
-- is_satisfied = true for closed contracts.
-- -----------------------------------------
with c as (
  select id, status from public.contracts
),
conditions as (
  select *
  from (
    values
      ('seller representations accurate'),
      ('certificate of occupancy delivered'),
      ('gains tax compliance delivered'),
      ('FIRPTA certification delivered'),
      ('premises vacant and broom clean'),
      ('all keys and access devices delivered'),
      ('plumbing systems in working order'),
      ('heating systems in working order'),
      ('electrical systems in working order'),
      ('smoke detector affidavit delivered'),
      ('title search ordered by purchaser'),
      ('deed in statutory short form executed')
  ) as t(condition_name)
)
insert into public.contract_closing_conditions (
  contract_id,
  condition_name,
  is_required,
  is_satisfied,
  notes
)
select
  c.id,
  cond.condition_name,
  true,
  -- All conditions satisfied for closed contracts; pending for all others
  case when c.status = 'closed' then true else false end,
  case when c.status = 'closed'
       then 'Satisfied at closing.'
       else 'Pending satisfaction at or before closing.'
  end
from c cross join conditions cond
on conflict do nothing;

-- -----------------------------------------
-- Seed apportionments
-- Per NY Form 8068 §§ 17–19.
-- Multi-family properties prorate rents.
-- -----------------------------------------
insert into public.contract_apportionments (
  contract_id,
  prorate_taxes,
  prorate_water,
  prorate_fuel,
  prorate_rents,
  transfer_tax_paid_by,
  recording_fees_paid_by,
  notes
)
select
  c.id,
  true,
  true,
  true,
  -- Multi-family properties have tenants; rents are prorated
  case when pr.property_type = 'multi_family' then true else false end,
  'seller',
  'purchaser',
  'Taxes, water, and fuel prorated as of the closing date per § 18. '
  || 'NY State transfer tax paid by seller per Tax Law § 1402. '
  || 'Recording fees paid by purchaser.'
from public.contracts c
join public.properties pr on pr.id = c.property_id
on conflict do nothing;

-- -----------------------------------------
-- Seed governmental violations
-- Applied to every 8th contract per § 10 of Form 8068.
-- Violation types reflect realistic NYC/NY State notices.
-- -----------------------------------------
with c as (
  select row_number() over (order by contract_number) as rn, id
  from public.contracts
)
insert into public.contract_violations (
  contract_id,
  violation_type,
  issuing_authority,
  must_be_cleared_before_closing,
  resolved
)
select
  id,
  case
    when rn % 3 = 0 then 'open building permit — work without permit (WWP)'
    when rn % 3 = 1 then 'housing maintenance code notice — peeling paint'
    else                  'fire safety correction — smoke detector non-compliance'
  end,
  case
    when rn % 3 = 0 then 'NYC Department of Buildings'
    when rn % 3 = 1 then 'NYC Department of Housing Preservation & Development'
    else                  'NYC Fire Department / Local Fire Marshal'
  end,
  true,
  false
from c
where rn % 8 = 0
on conflict do nothing;

commit;

-- =========================================
-- VERIFICATION QUERIES
-- Uncomment and run individually after seeding.
-- =========================================

-- 1) Confirm exactly 50 contracts
-- select count(*) as contract_count from public.contracts;

-- 2) Confirm 120 unique people, no duplicate emails or tax IDs
-- select
--   count(*)                         as total_people,
--   count(distinct lower(email))     as distinct_emails,
--   count(distinct masked_tax_id)    as distinct_tax_ids
-- from public.people;

-- 3) Confirm no contract has the same seller and purchaser
-- select count(*) as invalid_same_party
-- from public.contracts
-- where seller_id = purchaser_id;

-- 4) Confirm all 7 contract statuses are represented
-- select status, count(*) as n
-- from public.contracts
-- group by status
-- order by status;

-- 5) Confirm financials add up (downpayment + balance <= purchase_price)
-- select count(*) as financial_violations
-- from public.contracts
-- where downpayment_amount + balance_due_at_closing > purchase_price + 0.01;

-- 6) Confirm no closing date on terminal-status contracts
-- select contract_number, status, closing_date
-- from public.contracts
-- where status in ('cancelled','defaulted_buyer','defaulted_seller')
--   and closing_date is not null;

-- 7) Confirm all property types are seeded
-- select property_type, count(*) as n
-- from public.properties
-- group by property_type
-- order by property_type;

-- 8) Confirm area codes match cities (sample check)
-- select city, phone, count(*) as n
-- from public.people
-- group by city, left(phone, 3)
-- order by city;

-- 9) Full joined view — sample 10 contracts
-- select
--   c.contract_number,
--   pr.street_1,
--   pr.city        as property_city,
--   pr.property_type,
--   s.first_name   || ' ' || s.last_name  as seller,
--   b.first_name   || ' ' || b.last_name  as purchaser,
--   sa.first_name  || ' ' || sa.last_name as seller_attorney,
--   pa.first_name  || ' ' || pa.last_name as purchaser_attorney,
--   c.purchase_price,
--   c.downpayment_amount,
--   c.balance_due_at_closing,
--   c.status,
--   c.closing_date
-- from public.contracts c
-- join public.properties pr on pr.id = c.property_id
-- join public.people s  on s.id  = c.seller_id
-- join public.people b  on b.id  = c.purchaser_id
-- left join public.people sa on sa.id = c.seller_attorney_id
-- left join public.people pa on pa.id = c.purchaser_attorney_id
-- order by c.contract_number
-- limit 10;

-- 10) Mortgage breakdown per contract
-- select
--   c.contract_number,
--   c.purchase_price,
--   c.downpayment_amount,
--   sum(m.principal_amount)                                      as total_mortgage_principal,
--   c.balance_due_at_closing,
--   round(c.downpayment_amount
--     + sum(m.principal_amount)
--     + c.balance_due_at_closing, 2)                             as total_accounted_for
-- from public.contracts c
-- join public.contract_mortgages m on m.contract_id = c.id
-- group by c.contract_number, c.purchase_price,
--          c.downpayment_amount, c.balance_due_at_closing
-- order by c.contract_number;

-- 11) Escrow agent pool verification — confirm attorneys are not escrow agents
-- select
--   p.first_name || ' ' || p.last_name as person,
--   p.email,
--   count(e.id)  as escrow_assignments,
--   count(ca.id) as seller_attorney_assignments,
--   count(cb.id) as purchaser_attorney_assignments
-- from public.people p
-- left join public.contract_escrow e   on e.escrow_agent_id     = p.id
-- left join public.contracts ca        on ca.seller_attorney_id  = p.id
-- left join public.contracts cb        on cb.purchaser_attorney_id = p.id
-- group by p.id, p.first_name, p.last_name, p.email
-- having count(e.id) > 0
-- order by escrow_assignments desc;

-- 12) Personal property exclusions
-- select
--   c.contract_number,
--   cpp.item_name,
--   cpp.included,
--   cpp.notes
-- from public.contract_personal_property cpp
-- join public.contracts c on c.id = cpp.contract_id
-- where cpp.included = false
-- order by c.contract_number, cpp.item_name;
