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

