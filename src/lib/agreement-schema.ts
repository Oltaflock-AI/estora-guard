export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'toggle'
  | 'dropdown'
  | 'calculated'
  | 'masked';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  table?: string;
  pii?: boolean;
  options?: string[];
  formula?: string;
}

export interface SectionDef {
  id: string;
  label: string;
  table: string;
  fields: FieldDef[];
}

// 10 PA-aligned sections, ordered to follow the PAR Form ASR paragraph flow:
//   Para 1   → Parties
//   Para 1,6 → Property
//   Para 2,3 → Purchase Price & Deposits
//   Para 8,9 → Mortgage Contingency
//   Para 12,13 → Inspections & Contingency
//   Para 5,4  → Title & Settlement
//   Para 11   → Escrow
//   Para 14   → Costs at Settlement
//   Para 10,15,17 → Conditions & Representations
//   Para 7,22 → Fixtures & Additional Terms

export const AGREEMENT_SECTIONS: SectionDef[] = [
  {
    id: 'parties',
    label: 'Parties',
    table: 'contracts + people',
    fields: [
      { name: 'seller_first_name', label: 'Seller First Name', type: 'text', required: true, table: 'people' },
      { name: 'seller_last_name', label: 'Seller Last Name', type: 'text', required: true, table: 'people' },
      { name: 'seller_email', label: 'Seller Email', type: 'text', required: true, table: 'people' },
      { name: 'seller_phone', label: 'Seller Phone', type: 'text', table: 'people' },
      { name: 'seller_city', label: 'Seller City', type: 'text', required: true, table: 'people' },
      { name: 'seller_masked_tax_id', label: 'Seller SSN/Fed ID', type: 'masked', pii: true, table: 'people' },
      { name: 'purchaser_first_name', label: 'Purchaser First Name', type: 'text', required: true, table: 'people' },
      { name: 'purchaser_last_name', label: 'Purchaser Last Name', type: 'text', required: true, table: 'people' },
      { name: 'purchaser_email', label: 'Purchaser Email', type: 'text', required: true, table: 'people' },
      { name: 'purchaser_phone', label: 'Purchaser Phone', type: 'text', table: 'people' },
      { name: 'purchaser_city', label: 'Purchaser City', type: 'text', required: true, table: 'people' },
      { name: 'purchaser_masked_tax_id', label: 'Purchaser SSN/Fed ID', type: 'masked', pii: true, table: 'people' },
      { name: 'seller_attorney', label: "Seller's Attorney", type: 'text', table: 'people' },
      { name: 'purchaser_attorney', label: "Purchaser's Attorney", type: 'text', table: 'people' },
    ],
  },
  {
    id: 'property',
    label: 'Property',
    table: 'properties',
    fields: [
      { name: 'street_1', label: 'Street Address', type: 'text', required: true },
      { name: 'street_2', label: 'Unit/Apt', type: 'text' },
      { name: 'city', label: 'City', type: 'text', required: true },
      { name: 'postal_code', label: 'Zip Code', type: 'text', required: true },
      { name: 'municipality', label: 'Municipality', type: 'text' },
      { name: 'county', label: 'County', type: 'text', required: true },
      { name: 'school_district', label: 'School District', type: 'text' },
      { name: 'tax_parcel_id', label: 'Tax Parcel ID', type: 'text' },
      { name: 'mls_number', label: 'MLS Number', type: 'text' },
      { name: 'zoning', label: 'Zoning Classification', type: 'text' },
      {
        name: 'property_type',
        label: 'Property Type',
        type: 'dropdown',
        options: ['single_family', 'condo', 'co_op', 'townhouse', 'multi_family'],
      },
      { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
      { name: 'bathrooms', label: 'Bathrooms', type: 'number' },
      { name: 'year_built', label: 'Year Built', type: 'number' },
      { name: 'legal_description', label: 'Legal Description', type: 'textarea', required: true },
      { name: 'has_public_road_access', label: 'Public Road Access', type: 'toggle' },
      { name: 'delivered_vacant', label: 'Delivered Vacant', type: 'toggle' },
      { name: 'as_is_sale', label: 'As-Is Sale', type: 'toggle' },
    ],
  },
  {
    id: 'price',
    label: 'Purchase Price & Deposits',
    table: 'contracts',
    fields: [
      { name: 'purchase_price', label: 'Purchase Price', type: 'currency', required: true },
      { name: 'initial_deposit_amount', label: 'Initial Deposit (within 3 business days)', type: 'currency' },
      { name: 'additional_deposit_amount', label: 'Additional Deposit', type: 'currency' },
      { name: 'downpayment_amount', label: 'Down Payment (Total)', type: 'currency', required: true },
      {
        name: 'balance_due_at_closing',
        label: 'Balance Due at Settlement',
        type: 'calculated',
        formula: 'purchase_price - downpayment_amount',
      },
      { name: 'seller_assist_amount', label: 'Seller Assist (toward Buyer costs)', type: 'currency' },
      {
        name: 'acceptable_funds',
        label: 'Acceptable Funds',
        type: 'dropdown',
        options: ['cash', 'certified_check', 'official_bank_check', 'wire', 'other'],
      },
    ],
  },
  {
    id: 'mortgage',
    label: 'Mortgage Contingency',
    table: 'contract_mortgages',
    fields: [
      { name: 'subject_to_mortgage_contingency', label: 'Subject to Mortgage Contingency', type: 'toggle', table: 'contracts' },
      {
        name: 'mortgage_type',
        label: 'Mortgage Type',
        type: 'dropdown',
        options: ['institutional', 'existing_assumed', 'purchase_money'],
      },
      { name: 'lender_name', label: 'Lender / Institution', type: 'text' },
      { name: 'principal_amount', label: 'Principal Amount', type: 'currency' },
      { name: 'interest_rate', label: 'Interest Rate (Max)', type: 'percentage' },
      { name: 'mortgage_term_years', label: 'Term (Years)', type: 'number', table: 'contracts' },
      { name: 'monthly_payment', label: 'Monthly Payment', type: 'currency' },
      { name: 'pre_approval_letter_date', label: 'Pre-Approval Letter Date', type: 'date', table: 'contracts' },
      { name: 'commitment_date', label: 'Commitment Date', type: 'date', table: 'contracts' },
      { name: 'escrow_required', label: 'Lender Escrow Required', type: 'toggle' },
      { name: 'commitment_received', label: 'Commitment Received', type: 'toggle' },
    ],
  },
  {
    id: 'inspections',
    label: 'Inspections & Contingency',
    table: 'contracts',
    fields: [
      { name: 'inspection_contingency_days', label: 'Contingency Period (Days)', type: 'number' },
      { name: 'inspection_deadline', label: 'Inspection Deadline', type: 'date' },
      { name: 'home_inspection_elected', label: 'Home / General Property Inspection', type: 'toggle' },
      { name: 'wood_destroying_insect_inspection_elected', label: 'Wood-Destroying Insects (Termite)', type: 'toggle' },
      { name: 'radon_inspection_elected', label: 'Radon', type: 'toggle' },
      { name: 'mold_inspection_elected', label: 'Mold / Environmental Hazards', type: 'toggle' },
      { name: 'water_quality_inspection_elected', label: 'Water Quality (if applicable)', type: 'toggle' },
      { name: 'septic_inspection_elected', label: 'Septic / Sewer (if applicable)', type: 'toggle' },
      { name: 'lead_based_paint_inspection_elected', label: 'Lead-Based Paint (pre-1978 only)', type: 'toggle' },
      { name: 'boundary_survey_elected', label: 'Property Boundaries / Survey', type: 'toggle' },
    ],
  },
  {
    id: 'settlement',
    label: 'Title & Settlement',
    table: 'contracts',
    fields: [
      { name: 'contract_date', label: 'Execution Date', type: 'date', required: true },
      { name: 'closing_date', label: 'Settlement Date', type: 'date' },
      { name: 'settlement_time', label: 'Settlement Time', type: 'text' },
      { name: 'settlement_location', label: 'Settlement Location', type: 'textarea' },
      { name: 'title_company_name', label: 'Title Company', type: 'text' },
    ],
  },
  {
    id: 'escrow',
    label: 'Escrow',
    table: 'contract_escrow',
    fields: [
      { name: 'escrow_agent', label: 'Escrow Agent', type: 'text', required: true },
      { name: 'bank_name', label: 'Escrow Company / Bank', type: 'text', required: true },
      { name: 'account_reference', label: 'Escrow Account #', type: 'text', required: true },
      { name: 'amount_held', label: 'Escrow Amount', type: 'currency', required: true },
      { name: 'segregated_account', label: 'Segregated Account', type: 'toggle' },
    ],
  },
  {
    id: 'costs',
    label: 'Costs at Settlement',
    table: 'contracts',
    fields: [
      { name: 'pa_realty_transfer_tax_seller', label: "Seller's PA Realty Transfer Tax (1%)", type: 'currency' },
      { name: 'pa_realty_transfer_tax_buyer', label: "Buyer's PA Realty Transfer Tax (1%)", type: 'currency' },
      { name: 'local_transfer_tax', label: 'Local Transfer Tax (per side)', type: 'currency' },
    ],
  },
  {
    id: 'conditions',
    label: 'Conditions & Representations',
    table: 'contracts',
    fields: [
      {
        name: 'water_source',
        label: 'Status of Water',
        type: 'dropdown',
        options: ['public', 'community', 'on_site_well', 'none'],
      },
      {
        name: 'sewage_disposal',
        label: 'Status of Sewer',
        type: 'dropdown',
        options: ['public', 'community', 'individual_on_lot', 'holding_tank', 'none'],
      },
      { name: 'seller_has_right_to_sell', label: 'Seller Has Right to Sell', type: 'toggle' },
      { name: 'seller_not_foreign_person', label: 'Seller Not Foreign Person (FIRPTA)', type: 'toggle' },
      { name: 'no_undisclosed_abatements', label: 'No Undisclosed Abatements', type: 'toggle' },
      { name: 'title_insurable', label: 'Title Insurable at Standard Rates', type: 'toggle' },
      { name: 'premises_broom_clean', label: 'Premises Broom-Clean at Settlement', type: 'toggle' },
      { name: 'systems_in_working_order', label: 'Systems in Working Order', type: 'toggle' },
      { name: 'smoke_detector_affidavit_required', label: 'Smoke Detector & CO Affidavit', type: 'toggle' },
      { name: 'firpta_cert_required', label: 'FIRPTA Certification Required', type: 'toggle' },
      { name: 'megan_law_notice_acknowledged', label: "Megan's Law Notice Acknowledged", type: 'toggle' },
    ],
  },
  {
    id: 'riders',
    label: 'Fixtures & Additional Terms',
    table: 'contracts',
    fields: [
      { name: 'notes', label: 'Additional Terms & Conditions', type: 'textarea' },
    ],
  },
];
