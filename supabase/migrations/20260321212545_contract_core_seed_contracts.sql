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
