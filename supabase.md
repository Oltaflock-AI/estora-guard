-- =========================================
-- SUPABASE / POSTGRES SQL
-- NY RESIDENTIAL CONTRACT OF SALE
-- Schema + seed data
-- 50 agreement examples
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
    create type property_type as enum ('single_family', 'condo', 'co_op', 'townhouse', 'multi_family');
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
    create type funds_type as enum ('cash', 'certified_check', 'official_bank_check', 'wire', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'mortgage_kind') then
    create type mortgage_kind as enum ('existing_assumed', 'purchase_money', 'institutional');
  end if;
end $$;

-- -----------------------------------------
-- Core tables
-- -----------------------------------------

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  city text not null,
  state text not null default 'NY',
  postal_code text,
  is_nyc boolean not null default false,
  masked_tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_email_unique unique (lower(email)),
  constraint people_masked_tax_id_unique unique (masked_tax_id),
  constraint people_state_check check (state = 'NY')
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  street_1 text not null,
  street_2 text,
  city text not null,
  state text not null default 'NY',
  postal_code text not null,
  county text not null,
  property_type property_type not null,
  bedrooms int,
  bathrooms numeric(3,1),
  year_built int,
  legal_description text not null,
  has_public_road_access boolean not null default true,
  delivered_vacant boolean not null default true,
  as_is_sale boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_unique_address unique (street_1, city, state, postal_code),
  constraint properties_state_check check (state = 'NY')
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique,
  property_id uuid not null references public.properties(id) on delete restrict,
  seller_id uuid not null references public.people(id) on delete restrict,
  purchaser_id uuid not null references public.people(id) on delete restrict,
  seller_attorney_id uuid references public.people(id) on delete restrict,
  purchaser_attorney_id uuid references public.people(id) on delete restrict,

  status contract_status not null default 'draft',
  contract_date date not null,
  closing_date date,
  commitment_date date,

  purchase_price numeric(12,2) not null check (purchase_price > 0),
  downpayment_amount numeric(12,2) not null default 0 check (downpayment_amount >= 0),
  balance_due_at_closing numeric(12,2) not null default 0 check (balance_due_at_closing >= 0),

  acceptable_funds funds_type not null default 'official_bank_check',

  subject_to_mortgage_contingency boolean not null default true,
  title_company_name text,
  schedule_a_legal_description text,

  seller_has_right_to_sell boolean not null default true,
  seller_not_foreign_person boolean not null default true,
  no_undisclosed_abatements boolean not null default true,
  title_insurable boolean not null default true,

  premises_broom_clean boolean not null default true,
  systems_in_working_order boolean not null default true,
  smoke_detector_affidavit_required boolean not null default true,
  certificate_of_occupancy_required boolean not null default true,
  firpta_cert_required boolean not null default true,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contracts_distinct_parties check (seller_id <> purchaser_id),
  constraint contracts_financials_check check (
    purchase_price >= downpayment_amount
    and purchase_price >= balance_due_at_closing
  )
);

create table if not exists public.contract_personal_property (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  item_name text not null,
  included boolean not null default true,
  notes text,
  constraint contract_personal_property_unique unique (contract_id, item_name)
);

create table if not exists public.contract_permitted_exceptions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  exception_name text not null,
  details text,
  constraint contract_permitted_exceptions_unique unique (contract_id, exception_name)
);

create table if not exists public.contract_violations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  violation_type text not null,
  issuing_authority text,
  must_be_cleared_before_closing boolean not null default true,
  resolved boolean not null default false
);

create table if not exists public.contract_mortgages (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  mortgage_type mortgage_kind not null,
  lender_name text,
  principal_amount numeric(12,2) not null check (principal_amount >= 0),
  interest_rate numeric(5,3) check (interest_rate >= 0 and interest_rate <= 100),
  monthly_payment numeric(12,2),
  escrow_required boolean not null default false,
  commitment_received boolean not null default false,
  commitment_received_date date,
  subordinate_to_future_financing boolean not null default false
);

create table if not exists public.contract_escrow (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id) on delete cascade,
  escrow_agent_id uuid not null references public.people(id) on delete restrict,
  bank_name text not null,
  account_reference text not null,
  amount_held numeric(12,2) not null check (amount_held >= 0),
  segregated_account boolean not null default true,
  dispute_flag boolean not null default false,
  release_terms text
);

create table if not exists public.contract_closing_conditions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  condition_name text not null,
  is_required boolean not null default true,
  is_satisfied boolean not null default false,
  notes text,
  constraint contract_closing_conditions_unique unique (contract_id, condition_name)
);

create table if not exists public.contract_apportionments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id) on delete cascade,
  prorate_taxes boolean not null default true,
  prorate_water boolean not null default true,
  prorate_fuel boolean not null default true,
  prorate_rents boolean not null default false,
  transfer_tax_paid_by text not null default 'seller',
  recording_fees_paid_by text not null default 'purchaser',
  notes text
);

-- -----------------------------------------
-- Updated-at triggers
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

-- -----------------------------------------
-- Seed people
-- 120 unique people across NYC + NY State
-- No duplicates by lower(email) or masked_tax_id
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
      ('Manhattan', true,  'New York'),
      ('Brooklyn',  true,  'Kings'),
      ('Queens',    true,  'Queens'),
      ('Bronx',     true,  'Bronx'),
      ('Staten Island', true, 'Richmond'),
      ('Buffalo',   false, 'Erie'),
      ('Rochester', false, 'Monroe'),
      ('Yonkers',   false, 'Westchester'),
      ('White Plains', false, 'Westchester'),
      ('Albany',    false, 'Albany'),
      ('Syracuse',  false, 'Onondaga'),
      ('Ithaca',    false, 'Tompkins'),
      ('New Rochelle', false, 'Westchester'),
      ('Mount Vernon', false, 'Westchester'),
      ('Poughkeepsie', false, 'Dutchess'),
      ('Troy',      false, 'Rensselaer'),
      ('Schenectady', false, 'Schenectady'),
      ('Utica',     false, 'Oneida'),
      ('Binghamton', false, 'Broome'),
      ('Niagara Falls', false, 'Niagara')
  ) as t(city, is_nyc, county)
),
numbered_people as (
  select
    gs as n,
    (select arr[((gs - 1) % array_length(arr, 1)) + 1] from first_names) as first_name,
    (select arr[(((gs - 1) / 2) % array_length(arr, 1)) + 1] from last_names) as last_name,
    (select city from cities order by city offset ((gs - 1) % 20) limit 1) as city,
    (select is_nyc from cities order by city offset ((gs - 1) % 20) limit 1) as is_nyc
  from generate_series(1, 120) gs
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
  '212-555-' || lpad((1000 + n)::text, 4, '0') as phone,
  city,
  'NY',
  lpad((10000 + n)::text, 5, '0') as postal_code,
  is_nyc,
  'XXX-XX-' || lpad((1000 + n)::text, 4, '0') as masked_tax_id
from numbered_people
on conflict do nothing;

-- -----------------------------------------
-- Seed properties
-- 50 unique NY properties
-- -----------------------------------------
with prop_seed as (
  select *
  from (
    values
      (1,  '112 W 87th St',        'Manhattan',      '10024', 'New York',      'single_family'),
      (2,  '245 Dean St',          'Brooklyn',       '11217', 'Kings',         'townhouse'),
      (3,  '37-18 85th St',        'Queens',         '11372', 'Queens',        'condo'),
      (4,  '815 Grand Concourse',  'Bronx',          '10451', 'Bronx',         'co_op'),
      (5,  '29 Stuyvesant Pl',     'Staten Island',  '10301', 'Richmond',      'single_family'),
      (6,  '74 Bidwell Pkwy',      'Buffalo',        '14222', 'Erie',          'single_family'),
      (7,  '21 Oxford St',         'Rochester',      '14607', 'Monroe',        'townhouse'),
      (8,  '92 Park Hill Ave',     'Yonkers',        '10705', 'Westchester',   'single_family'),
      (9,  '10 Lake St',           'White Plains',   '10603', 'Westchester',   'condo'),
      (10, '55 Dove St',           'Albany',         '12210', 'Albany',        'townhouse'),
      (11, '143 Euclid Ave',       'Syracuse',       '13210', 'Onondaga',      'single_family'),
      (12, '8 Cascadilla Park',    'Ithaca',         '14850', 'Tompkins',      'single_family'),
      (13, '17 Webster Ave',       'New Rochelle',   '10801', 'Westchester',   'condo'),
      (14, '66 S 11th Ave',        'Mount Vernon',   '10550', 'Westchester',   'single_family'),
      (15, '109 Hooker Ave',       'Poughkeepsie',   '12601', 'Dutchess',      'single_family'),
      (16, '31 2nd St',            'Troy',           '12180', 'Rensselaer',    'townhouse'),
      (17, '402 Union St',         'Schenectady',    '12305', 'Schenectady',   'co_op'),
      (18, '77 Genesee St',        'Utica',          '13502', 'Oneida',        'single_family'),
      (19, '14 Riverside Dr',      'Binghamton',     '13905', 'Broome',        'single_family'),
      (20, '801 Whirlpool St',     'Niagara Falls',  '14305', 'Niagara',       'townhouse'),
      (21, '300 E 74th St',        'Manhattan',      '10021', 'New York',      'condo'),
      (22, '1223 Bergen St',       'Brooklyn',       '11213', 'Kings',         'single_family'),
      (23, '66-11 Yellowstone Blvd','Queens',        '11375', 'Queens',        'co_op'),
      (24, '251 City Island Ave',  'Bronx',          '10464', 'Bronx',         'single_family'),
      (25, '45 Grymes Hill Rd',    'Staten Island',  '10301', 'Richmond',      'townhouse'),
      (26, '19 Norwood Ave',       'Buffalo',        '14222', 'Erie',          'condo'),
      (27, '415 Park Ave',         'Rochester',      '14607', 'Monroe',        'single_family'),
      (28, '7 Bronxville Glen Dr', 'Yonkers',        '10708', 'Westchester',   'condo'),
      (29, '88 Mamaroneck Ave',    'White Plains',   '10601', 'Westchester',   'co_op'),
      (30, '24 Madison Ave',       'Albany',         '12202', 'Albany',        'single_family'),
      (31, '918 Euclid Ave',       'Syracuse',       '13210', 'Onondaga',      'townhouse'),
      (32, '42 Stewart Ave',       'Ithaca',         '14850', 'Tompkins',      'condo'),
      (33, '505 Main St',          'New Rochelle',   '10801', 'Westchester',   'townhouse'),
      (34, '13 S Fulton Ave',      'Mount Vernon',   '10550', 'Westchester',   'co_op'),
      (35, '250 Mill St',          'Poughkeepsie',   '12601', 'Dutchess',      'condo'),
      (36, '99 River St',          'Troy',           '12180', 'Rensselaer',    'single_family'),
      (37, '18 N Church St',       'Schenectady',    '12305', 'Schenectady',   'single_family'),
      (38, '256 Culver Ave',       'Utica',          '13501', 'Oneida',        'townhouse'),
      (39, '61 Front St',          'Binghamton',     '13905', 'Broome',        'condo'),
      (40, '14 Ferry Ave',         'Niagara Falls',  '14301', 'Niagara',       'single_family'),
      (41, '170 W 10th St',        'Manhattan',      '10014', 'New York',      'co_op'),
      (42, '8901 3rd Ave',         'Brooklyn',       '11209', 'Kings',         'condo'),
      (43, '150-12 12th Ave',      'Queens',         '11357', 'Queens',        'single_family'),
      (44, '1200 Pelham Pkwy S',   'Bronx',          '10461', 'Bronx',         'condo'),
      (45, '88 Tysen St',          'Staten Island',  '10301', 'Richmond',      'single_family'),
      (46, '212 Richmond Ave',     'Buffalo',        '14222', 'Erie',          'townhouse'),
      (47, '511 East Ave',         'Rochester',      '14607', 'Monroe',        'condo'),
      (48, '27 Warburton Ave',     'Yonkers',        '10701', 'Westchester',   'townhouse'),
      (49, '9 Barker Ave',         'White Plains',   '10601', 'Westchester',   'single_family'),
      (50, '71 Lark St',           'Albany',         '12210', 'Albany',        'condo')
  ) as t(n, street_1, city, postal_code, county, property_type_text)
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
  2 + (n % 4),
  1.0 + ((n % 5) * 0.5),
  1925 + (n % 90),
  'Schedule A legal description for ' || street_1 || ', ' || city || ', New York.',
  true,
  true,
  true
from prop_seed
on conflict do nothing;

-- -----------------------------------------
-- Seed attorneys and escrow agents from existing people pool
-- Reuse people; do not create duplicates
-- -----------------------------------------

-- -----------------------------------------
-- Seed contracts
-- 50 agreements
-- seller_id = people 1..50
-- purchaser_id = people 51..100
-- seller attorney = people 101..110 rotating
-- purchaser attorney = people 111..120 rotating
-- escrow agent = people 101..110 rotating
-- -----------------------------------------
with prop as (
  select row_number() over (order by street_1, city) as rn, id
  from public.properties
),
p as (
  select row_number() over (order by created_at, id) as rn, id
  from public.people
),
contract_seed as (
  select
    gs as n,
    'NYRCS-' || to_char(gs, 'FM0000') as contract_number,
    (select id from prop where rn = gs) as property_id,
    (select id from p where rn = gs) as seller_id,
    (select id from p where rn = gs + 50) as purchaser_id,
    (select id from p where rn = 100 + ((gs - 1) % 10) + 1) as seller_attorney_id,
    (select id from p where rn = 110 + ((gs - 1) % 10) + 1) as purchaser_attorney_id,
    date '2026-01-01' + ((gs - 1) * interval '1 day') as contract_date,
    date '2026-02-15' + ((gs - 1) * interval '1 day') as closing_date,
    date '2026-01-20' + ((gs - 1) * interval '1 day') as commitment_date,
    (350000 + gs * 12000)::numeric(12,2) as purchase_price
  from generate_series(1, 50) gs
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
  case
    when n % 13 = 0 then 'pending_commitment'::contract_status
    when n % 17 = 0 then 'cancelled'::contract_status
    else 'active'::contract_status
  end,
  contract_date,
  closing_date,
  commitment_date,
  purchase_price,
  round((purchase_price * 0.10), 2) as downpayment_amount,
  round((purchase_price * 0.90), 2) as balance_due_at_closing,
  case
    when n % 4 = 0 then 'wire'::funds_type
    when n % 3 = 0 then 'certified_check'::funds_type
    else 'official_bank_check'::funds_type
  end,
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
from contract_seed
on conflict do nothing;

-- -----------------------------------------
-- Seed escrow records
-- -----------------------------------------
with c as (
  select row_number() over (order by contract_number) as rn, id, downpayment_amount
  from public.contracts
),
p as (
  select row_number() over (order by created_at, id) as rn, id
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
  (select id from p where rn = 100 + ((c.rn - 1) % 10) + 1) as escrow_agent_id,
  case when c.rn % 2 = 0 then 'JPMorgan Chase Bank' else 'M&T Bank' end,
  'ESCROW-' || to_char(c.rn, 'FM0000'),
  c.downpayment_amount,
  true,
  false,
  'Held pending closing or lawful termination; disputed releases require joint written direction or court order.'
from c
on conflict do nothing;

-- -----------------------------------------
-- Seed mortgages
-- One institutional mortgage for every contract
-- Existing assumed mortgage on every 5th contract
-- Purchase money mortgage on every 7th contract
-- -----------------------------------------
with c as (
  select row_number() over (order by contract_number) as rn, id, purchase_price, commitment_date
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
    when rn % 3 = 0 then 'Wells Fargo Bank'
    when rn % 3 = 1 then 'Bank of America'
    else 'Citibank'
  end,
  round(purchase_price * 0.72, 2),
  6.125 + ((rn % 5) * 0.125),
  round((purchase_price * 0.72) / 240, 2),
  true,
  case when rn % 17 = 0 then false else true end,
  case when rn % 17 = 0 then null else commitment_date - 3 end,
  false
from c
on conflict do nothing;

with c as (
  select row_number() over (order by contract_number) as rn, id, purchase_price
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
  'Assumed Mortgage Servicer',
  round(purchase_price * 0.15, 2),
  4.250,
  round((purchase_price * 0.15) / 180, 2),
  false,
  true,
  false
from c
where rn % 5 = 0
on conflict do nothing;

with c as (
  select row_number() over (order by contract_number) as rn, id, purchase_price
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
  true
from c
where rn % 7 = 0
on conflict do nothing;

-- -----------------------------------------
-- Seed personal property inclusions
-- Standard inclusions per contract
-- -----------------------------------------
with c as (
  select id
  from public.contracts
),
items as (
  select *
  from (
    values
      ('plumbing fixtures'),
      ('heating fixtures'),
      ('lighting fixtures'),
      ('cooking fixtures'),
      ('refrigerator'),
      ('dishwasher'),
      ('oven/range'),
      ('window treatments'),
      ('outdoor landscaping items'),
      ('built-in shelving')
  ) as t(item_name)
)
insert into public.contract_personal_property (contract_id, item_name, included, notes)
select
  c.id,
  i.item_name,
  true,
  'Included unless specifically excluded in rider.'
from c
cross join items i
on conflict do nothing;

-- -----------------------------------------
-- Seed permitted exceptions
-- -----------------------------------------
with c as (
  select id
  from public.contracts
),
exceptions as (
  select *
  from (
    values
      ('zoning laws', 'Subject to applicable zoning and land use regulations.'),
      ('encroachments', 'Minor visible or survey encroachments if title company insures over them.'),
      ('unpaid taxes not yet due', 'Not yet due and payable as of closing date.'),
      ('utility easements', 'Public utility easements of record.'),
      ('covenants and restrictions', 'Matters of record that do not materially interfere with residential use.')
  ) as t(exception_name, details)
)
insert into public.contract_permitted_exceptions (contract_id, exception_name, details)
select c.id, e.exception_name, e.details
from c
cross join exceptions e
on conflict do nothing;

-- -----------------------------------------
-- Seed closing conditions
-- -----------------------------------------
with c as (
  select id
  from public.contracts
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
      ('keys delivered'),
      ('plumbing in working order'),
      ('heating in working order'),
      ('electrical in working order'),
      ('smoke detector affidavit delivered')
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
  conditions.condition_name,
  true,
  false,
  'Pending satisfaction at or before closing.'
from c
cross join conditions
on conflict do nothing;

-- -----------------------------------------
-- Seed apportionments
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
  id,
  true,
  true,
  true,
  false,
  'seller',
  'purchaser',
  'Taxes, water, and fuel prorated as of closing date.'
from public.contracts
on conflict do nothing;

-- -----------------------------------------
-- Seed selected governmental violations
-- On some contracts only
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
    when rn % 3 = 0 then 'open building permit'
    when rn % 3 = 1 then 'housing code notice'
    else 'fire safety correction'
  end,
  case
    when rn % 3 = 0 then 'Department of Buildings'
    when rn % 3 = 1 then 'Local Municipality'
    else 'Fire Department'
  end,
  true,
  false
from c
where rn % 8 = 0
on conflict do nothing;

commit;

-- =========================================
-- USEFUL VERIFICATION QUERIES
-- =========================================

-- 1) Confirm 50 contracts
-- select count(*) from public.contracts;

-- 2) Confirm unique people
-- select count(*) as total_people, count(distinct lower(email)) as distinct_emails from public.people;

-- 3) Confirm contracts have distinct seller/purchaser
-- select count(*) from public.contracts where seller_id = purchaser_id;

-- 4) Sample joined view
-- select
--   c.contract_number,
--   ps.street_1,
--   ps.city as property_city,
--   s.first_name || ' ' || s.last_name as seller_name,
--   b.first_name || ' ' || b.last_name as purchaser_name,
--   c.purchase_price,
--   c.status
-- from public.contracts c
-- join public.properties ps on ps.id = c.property_id
-- join public.people s on s.id = c.seller_id
-- join public.people b on b.id = c.purchaser_id
-- order by c.contract_number;
