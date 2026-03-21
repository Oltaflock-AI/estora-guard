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
      { name: 'county', label: 'County', type: 'text', required: true },
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
    label: 'Price & Terms',
    table: 'contracts',
    fields: [
      { name: 'purchase_price', label: 'Purchase Price', type: 'currency', required: true },
      { name: 'downpayment_amount', label: 'Down Payment', type: 'currency', required: true },
      {
        name: 'balance_due_at_closing',
        label: 'Balance Due at Closing',
        type: 'calculated',
        formula: 'purchase_price - downpayment_amount',
      },
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
    label: 'Mortgage',
    table: 'contract_mortgages',
    fields: [
      { name: 'subject_to_mortgage_contingency', label: 'Subject to Mortgage Contingency', type: 'toggle', table: 'contracts' },
      {
        name: 'mortgage_type',
        label: 'Mortgage Type',
        type: 'dropdown',
        options: ['institutional', 'existing_assumed', 'purchase_money'],
      },
      { name: 'lender_name', label: 'Lender', type: 'text' },
      { name: 'principal_amount', label: 'Principal Amount', type: 'currency' },
      { name: 'interest_rate', label: 'Interest Rate', type: 'percentage' },
      { name: 'monthly_payment', label: 'Monthly Payment', type: 'currency' },
      { name: 'escrow_required', label: 'Escrow Required', type: 'toggle' },
      { name: 'commitment_received', label: 'Commitment Received', type: 'toggle' },
      { name: 'commitment_received_date', label: 'Commitment Date', type: 'date' },
    ],
  },
  {
    id: 'escrow',
    label: 'Escrow',
    table: 'contract_escrow',
    fields: [
      { name: 'escrow_agent', label: 'Escrow Agent', type: 'text', required: true },
      { name: 'bank_name', label: 'Bank', type: 'text', required: true },
      { name: 'account_reference', label: 'Account Reference', type: 'text', required: true },
      { name: 'amount_held', label: 'Amount Held', type: 'currency', required: true },
      { name: 'segregated_account', label: 'Segregated Account', type: 'toggle' },
    ],
  },
  {
    id: 'closing',
    label: 'Closing',
    table: 'contracts',
    fields: [
      { name: 'contract_date', label: 'Contract Date', type: 'date', required: true },
      { name: 'closing_date', label: 'Closing Date', type: 'date' },
      { name: 'commitment_date', label: 'Commitment Date', type: 'date' },
      { name: 'title_company_name', label: 'Title Company', type: 'text' },
    ],
  },
  {
    id: 'conditions',
    label: 'Conditions & Representations',
    table: 'contracts + contract_closing_conditions',
    fields: [
      { name: 'seller_has_right_to_sell', label: 'Seller Has Right to Sell', type: 'toggle' },
      { name: 'seller_not_foreign_person', label: 'Seller Not Foreign Person', type: 'toggle' },
      { name: 'no_undisclosed_abatements', label: 'No Undisclosed Abatements', type: 'toggle' },
      { name: 'title_insurable', label: 'Title Insurable', type: 'toggle' },
      { name: 'premises_broom_clean', label: 'Premises Broom Clean', type: 'toggle' },
      { name: 'systems_in_working_order', label: 'Systems in Working Order', type: 'toggle' },
      { name: 'smoke_detector_affidavit_required', label: 'Smoke Detector Affidavit', type: 'toggle' },
      { name: 'certificate_of_occupancy_required', label: 'Certificate of Occupancy', type: 'toggle' },
      { name: 'firpta_cert_required', label: 'FIRPTA Certification', type: 'toggle' },
    ],
  },
  {
    id: 'riders',
    label: 'Personal Property, Exceptions & Riders',
    table: 'contract_personal_property + contract_permitted_exceptions',
    fields: [
      { name: 'notes', label: 'Additional Terms & Conditions', type: 'textarea', table: 'contracts' },
    ],
  },
];
