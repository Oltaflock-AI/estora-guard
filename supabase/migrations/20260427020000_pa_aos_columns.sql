-- Add PA-specific columns to properties and contracts so the Agreement-of-Sale
-- editor can render PA-aligned sections (Inspections, Costs at Settlement,
-- expanded Property + Settlement) instead of the NY-flavored skeleton.
--
-- All new columns are nullable / defaulted, so existing rows remain valid and
-- no backfill is required.

-- ── Properties ──────────────────────────────────────────────────────────────

alter table public.properties add column if not exists municipality      text;
alter table public.properties add column if not exists school_district   text;
alter table public.properties add column if not exists tax_parcel_id     text;
alter table public.properties add column if not exists mls_number        text;
alter table public.properties add column if not exists zoning            text;

-- ── Contracts: deposits + seller assist (Para 2, 3) ─────────────────────────

alter table public.contracts add column if not exists initial_deposit_amount    numeric(12,2);
alter table public.contracts add column if not exists additional_deposit_amount numeric(12,2);
alter table public.contracts add column if not exists seller_assist_amount      numeric(12,2);

-- ── Contracts: mortgage extras (Para 8) ─────────────────────────────────────

alter table public.contracts add column if not exists mortgage_term_years      integer;
alter table public.contracts add column if not exists pre_approval_letter_date date;

-- ── Contracts: inspections (Para 12, 13) ────────────────────────────────────

alter table public.contracts add column if not exists inspection_contingency_days integer;
alter table public.contracts add column if not exists inspection_deadline         date;
alter table public.contracts add column if not exists home_inspection_elected               boolean default false;
alter table public.contracts add column if not exists wood_destroying_insect_inspection_elected boolean default false;
alter table public.contracts add column if not exists radon_inspection_elected              boolean default false;
alter table public.contracts add column if not exists mold_inspection_elected               boolean default false;
alter table public.contracts add column if not exists water_quality_inspection_elected      boolean default false;
alter table public.contracts add column if not exists septic_inspection_elected             boolean default false;
alter table public.contracts add column if not exists lead_based_paint_inspection_elected   boolean default false;
alter table public.contracts add column if not exists boundary_survey_elected               boolean default false;

-- ── Contracts: settlement details (Para 4) ──────────────────────────────────

alter table public.contracts add column if not exists settlement_time     text;
alter table public.contracts add column if not exists settlement_location text;

-- ── Contracts: costs at settlement (Para 14) ────────────────────────────────

alter table public.contracts add column if not exists pa_realty_transfer_tax_seller numeric(12,2);
alter table public.contracts add column if not exists pa_realty_transfer_tax_buyer  numeric(12,2);
alter table public.contracts add column if not exists local_transfer_tax            numeric(12,2);

-- ── Contracts: seller representations (Para 10, 17) ─────────────────────────

alter table public.contracts add column if not exists water_source                  text;
alter table public.contracts add column if not exists sewage_disposal               text;
alter table public.contracts add column if not exists megan_law_notice_acknowledged boolean default false;
