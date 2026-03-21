'use client';

import type { Extraction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const FIELD_LABELS: Record<string, string> = {
  seller_first_name: 'Seller First Name',
  seller_last_name: 'Seller Last Name',
  seller_email: 'Seller Email',
  seller_phone: 'Seller Phone',
  seller_city: 'Seller City',
  seller_masked_tax_id: 'Seller SSN/Fed ID',
  purchaser_first_name: 'Purchaser First Name',
  purchaser_last_name: 'Purchaser Last Name',
  purchaser_email: 'Purchaser Email',
  purchaser_phone: 'Purchaser Phone',
  purchaser_city: 'Purchaser City',
  purchaser_masked_tax_id: 'Purchaser SSN/Fed ID',
  seller_attorney_name: "Seller's Attorney",
  purchaser_attorney_name: "Purchaser's Attorney",
  street_1: 'Street Address',
  street_2: 'Unit/Apt',
  city: 'City',
  county: 'County',
  postal_code: 'Zip Code',
  property_type: 'Property Type',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  year_built: 'Year Built',
  legal_description: 'Legal Description',
  has_public_road_access: 'Public Road Access',
  delivered_vacant: 'Delivered Vacant',
  as_is_sale: 'As-Is Sale',
  purchase_price: 'Purchase Price',
  downpayment_amount: 'Down Payment',
  balance_due_at_closing: 'Balance Due at Closing',
  acceptable_funds: 'Acceptable Funds',
  mortgage_type: 'Mortgage Type',
  lender_name: 'Lender',
  principal_amount: 'Mortgage Principal',
  interest_rate: 'Interest Rate',
  monthly_payment: 'Monthly Payment',
  escrow_required: 'Escrow Required',
  commitment_received: 'Commitment Received',
  contract_date: 'Contract Date',
  closing_date: 'Closing Date',
  commitment_date: 'Commitment Date',
  subject_to_mortgage_contingency: 'Mortgage Contingency',
  seller_has_right_to_sell: 'Seller Has Right to Sell',
  seller_not_foreign_person: 'Seller Not Foreign Person',
  no_undisclosed_abatements: 'No Undisclosed Abatements',
  title_insurable: 'Title Insurable',
  premises_broom_clean: 'Premises Broom Clean',
  systems_in_working_order: 'Systems in Working Order',
  smoke_detector_affidavit_required: 'Smoke Detector Affidavit',
  certificate_of_occupancy_required: 'Certificate of Occupancy',
  firpta_cert_required: 'FIRPTA Certification',
  escrow_agent_name: 'Escrow Agent',
  bank_name: 'Escrow Bank',
  account_reference: 'Account Reference',
  amount_held: 'Escrow Amount Held',
  segregated_account: 'Segregated Account',
  title_company_name: 'Title Company',
};

const SECTION_ORDER: Record<string, string[]> = {
  Parties: [
    'seller_first_name', 'seller_last_name', 'seller_email', 'seller_phone',
    'seller_city', 'seller_masked_tax_id',
    'purchaser_first_name', 'purchaser_last_name', 'purchaser_email', 'purchaser_phone',
    'purchaser_city', 'purchaser_masked_tax_id',
    'seller_attorney_name', 'purchaser_attorney_name',
  ],
  Property: [
    'street_1', 'street_2', 'city', 'county', 'postal_code',
    'property_type', 'bedrooms', 'bathrooms', 'year_built',
    'legal_description', 'has_public_road_access', 'delivered_vacant', 'as_is_sale',
  ],
  'Price & Terms': [
    'purchase_price', 'downpayment_amount', 'balance_due_at_closing', 'acceptable_funds',
  ],
  Mortgage: [
    'subject_to_mortgage_contingency', 'mortgage_type', 'lender_name',
    'principal_amount', 'interest_rate', 'monthly_payment',
    'escrow_required', 'commitment_received',
  ],
  Escrow: [
    'escrow_agent_name', 'bank_name', 'account_reference',
    'amount_held', 'segregated_account',
  ],
  'Dates & Closing': [
    'contract_date', 'closing_date', 'commitment_date', 'title_company_name',
  ],
  'Conditions & Representations': [
    'seller_has_right_to_sell', 'seller_not_foreign_person',
    'no_undisclosed_abatements', 'title_insurable',
    'premises_broom_clean', 'systems_in_working_order',
    'smoke_detector_affidavit_required', 'certificate_of_occupancy_required',
    'firpta_cert_required',
  ],
};

const CURRENCY_FIELDS = new Set([
  'purchase_price', 'downpayment_amount', 'balance_due_at_closing',
  'principal_amount', 'monthly_payment', 'amount_held',
]);

const DATE_FIELDS = new Set([
  'contract_date', 'closing_date', 'commitment_date',
]);

const ADDRESS_FIELDS = new Set([
  'street_1', 'street_2', 'city', 'county', 'postal_code',
]);

const BOOL_FIELDS = new Set([
  'has_public_road_access', 'delivered_vacant', 'as_is_sale',
  'subject_to_mortgage_contingency', 'seller_has_right_to_sell',
  'seller_not_foreign_person', 'no_undisclosed_abatements',
  'title_insurable', 'premises_broom_clean', 'systems_in_working_order',
  'smoke_detector_affidavit_required', 'certificate_of_occupancy_required',
  'firpta_cert_required', 'escrow_required', 'commitment_received',
  'segregated_account',
]);

function formatFieldValue(fieldName: string, value: string | null): string {
  if (!value) return '—';

  if (CURRENCY_FIELDS.has(fieldName)) {
    const n = Number(value.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? value : formatCurrency(n);
  }

  if (DATE_FIELDS.has(fieldName)) {
    return formatDate(value);
  }

  if (BOOL_FIELDS.has(fieldName)) {
    return value === 'true' ? 'Yes' : 'No';
  }

  if (fieldName === 'interest_rate') {
    const n = Number(value);
    return isNaN(n) ? value : `${n}%`;
  }

  if (fieldName === 'property_type') {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (fieldName === 'acceptable_funds') {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return value;
}

function ConfidenceDot({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;

  let color: string;
  let label: string;

  if (confidence >= 0.8) {
    color = 'bg-success';
    label = 'High confidence';
  } else if (confidence >= 0.6) {
    color = 'bg-warning';
    label = 'Medium confidence';
  } else {
    color = 'bg-error';
    label = 'Low confidence';
  }

  return (
    <span
      title={`${label} (${Math.round(confidence * 100)}%)`}
      className={`inline-block w-2 h-2 rounded-full ${color} flex-shrink-0`}
    />
  );
}

interface ExtractionViewerProps {
  extractions: Extraction[];
}

export default function ExtractionViewer({ extractions }: ExtractionViewerProps) {
  if (extractions.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-secondary text-sm italic">
          No fields were extracted from this document.
        </p>
      </div>
    );
  }

  const fieldMap = new Map(extractions.map((e) => [e.field_name, e]));

  let globalIndex = 0;

  return (
    <div className="space-y-6">
      {Object.entries(SECTION_ORDER).map(([sectionName, fieldNames]) => {
        const sectionFields = fieldNames
          .map((name) => fieldMap.get(name))
          .filter((e): e is Extraction => e !== undefined && e.field_value !== null);

        if (sectionFields.length === 0) return null;

        return (
          <div key={sectionName}>
            <h3 className="section-header mb-3">{sectionName}</h3>
            <div className="card divide-y divide-border">
              {sectionFields.map((extraction) => {
                const idx = globalIndex++;
                const label = FIELD_LABELS[extraction.field_name] ?? extraction.field_name;
                const isAddress = ADDRESS_FIELDS.has(extraction.field_name);

                return (
                  <div
                    key={extraction.id}
                    className="flex items-center justify-between py-3 px-1 stagger-in"
                    style={{ '--i': idx } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ConfidenceDot confidence={extraction.confidence} />
                      <span className="text-xs text-secondary truncate w-36 flex-shrink-0">
                        {label}
                      </span>
                    </div>
                    <span
                      className={`text-sm text-primary text-right truncate max-w-[60%] ${
                        isAddress ? 'font-mono' : ''
                      }`}
                    >
                      {formatFieldValue(extraction.field_name, extraction.field_value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
