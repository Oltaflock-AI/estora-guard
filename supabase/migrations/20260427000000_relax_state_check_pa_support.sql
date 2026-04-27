-- Relax NY-only state CHECK constraints so PA (and other US state codes)
-- can be stored on people and properties.
--
-- Original schema in 20260321212414_contract_core_schema.sql hardcoded:
--   constraint people_state_check     check (state = 'NY')
--   constraint properties_state_check check (state = 'NY')
--
-- These blocked all PA-first ingestion. Replace with a permissive 2-letter
-- USPS code check so values like 'PA', 'NJ', 'NY' are all valid.

alter table public.people
  drop constraint if exists people_state_check;

alter table public.people
  add constraint people_state_check
    check (state ~ '^[A-Z]{2}$');

alter table public.properties
  drop constraint if exists properties_state_check;

alter table public.properties
  add constraint properties_state_check
    check (state ~ '^[A-Z]{2}$');
