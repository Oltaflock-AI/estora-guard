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
