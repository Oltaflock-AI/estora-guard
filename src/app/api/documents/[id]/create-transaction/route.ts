import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateDefaultTimeline, applyDisclosureRules, type ExtractedDates } from '@/lib/services/timeline-service';
import { computeHealthScore } from '@/lib/services/health-service';
import { createAuditEvent } from '@/lib/services/audit-service';
import type { Database } from '@/lib/supabase/database.types';

type Extraction = Database['public']['Tables']['extractions']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];

function getField(extractions: Extraction[], name: string): string | null {
  return extractions.find((e) => e.field_name === name)?.field_value ?? null;
}

function getNumeric(extractions: Extraction[], name: string): number {
  const raw = getField(extractions, name);
  if (!raw) return 0;
  const n = Number(raw.replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function getBool(extractions: Extraction[], name: string): boolean {
  const raw = getField(extractions, name);
  return raw === 'true';
}

function generateContractNumber(stateCode: string): string {
  const seq = Math.floor(Math.random() * 9000) + 1000;
  const prefix = stateCode === 'NY' ? 'NYRCS' : 'PAAOS';
  return `${prefix}-${seq}`;
}

function normalizeStateCode(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  if (lower === 'pennsylvania' || lower === 'commonwealth of pennsylvania') return 'PA';
  if (lower === 'new york' || lower === 'state of new york') return 'NY';
  if (lower === 'new jersey') return 'NJ';
  return trimmed.slice(0, 2).toUpperCase();
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id: documentId } = await params;

  const { data: docRow, error: docError } = await serviceClient
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !docRow) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  const doc = docRow as Database['public']['Tables']['documents']['Row'];

  if (doc.status !== 'done') {
    return NextResponse.json(
      { error: 'Document extraction not complete.' },
      { status: 400 }
    );
  }

  if (doc.contract_id) {
    return NextResponse.json({
      id: doc.contract_id,
      message: 'Transaction already exists for this document.',
    });
  }

  const { data: rawExtractions } = await serviceClient
    .from('extractions')
    .select('*')
    .eq('document_id', documentId);

  const extractions = (rawExtractions ?? []) as Extraction[];

  const sellerFirst = getField(extractions, 'seller_first_name') ?? 'Unknown';
  const sellerLast = getField(extractions, 'seller_last_name') ?? 'Seller';
  const purchaserFirst = getField(extractions, 'purchaser_first_name') ?? 'Unknown';
  const purchaserLast = getField(extractions, 'purchaser_last_name') ?? 'Purchaser';
  const sellerEmail = getField(extractions, 'seller_email') ?? `${sellerFirst.toLowerCase()}.${sellerLast.toLowerCase()}@pending.estora.app`;
  const purchaserEmail = getField(extractions, 'purchaser_email') ?? `${purchaserFirst.toLowerCase()}.${purchaserLast.toLowerCase()}@pending.estora.app`;

  // State drives jurisdiction-specific defaults (city, county, contract prefix, timeline template).
  // Property state wins; fall back to seller state, then PA.
  const propertyState =
    normalizeStateCode(getField(extractions, 'state'))
    ?? normalizeStateCode(getField(extractions, 'governing_law_state'))
    ?? normalizeStateCode(getField(extractions, 'seller_state'))
    ?? 'PA';
  const isNY = propertyState === 'NY';
  const defaultCity = isNY ? 'New York' : 'Lansdale';
  const defaultCounty = isNY ? 'New York' : 'Montgomery';
  const defaultPostalCode = isNY ? '10001' : '19446';
  const sellerStateCode =
    normalizeStateCode(getField(extractions, 'seller_state')) ?? propertyState;
  const purchaserStateCode =
    normalizeStateCode(getField(extractions, 'purchaser_state')) ?? propertyState;

  // Expression index lower(email) is incompatible with PostgREST upsert onConflict,
  // so we select-or-insert instead.
  async function resolveOrCreatePerson(fields: {
    first_name: string;
    last_name: string;
    email: string;
    city: string;
    state: string;
    phone: string | null;
  }): Promise<string | null> {
    const { data: existing } = await serviceClient
      .from('people')
      .select('id')
      .ilike('email', fields.email)
      .limit(1)
      .single();
    if (existing) return (existing as { id: string }).id;

    const { data: inserted, error: insertErr } = await serviceClient
      .from('people')
      .insert(fields as never)
      .select('id')
      .single();
    if (insertErr) {
      console.error('People insert failed:', insertErr.message, fields);
    }
    return (inserted as { id: string } | null)?.id ?? null;
  }

  const sellerId = await resolveOrCreatePerson({
    first_name: sellerFirst,
    last_name: sellerLast,
    email: sellerEmail,
    city: getField(extractions, 'seller_city') ?? defaultCity,
    state: sellerStateCode,
    phone: getField(extractions, 'seller_phone'),
  });

  const purchaserId = await resolveOrCreatePerson({
    first_name: purchaserFirst,
    last_name: purchaserLast,
    email: purchaserEmail,
    city: getField(extractions, 'purchaser_city') ?? defaultCity,
    state: purchaserStateCode,
    phone: getField(extractions, 'purchaser_phone'),
  });

  if (!sellerId || !purchaserId) {
    return NextResponse.json({ error: 'Failed to resolve parties.' }, { status: 500 });
  }

  const street1 = getField(extractions, 'street_1') ?? '123 Main St';
  const city = getField(extractions, 'city') ?? defaultCity;
  const county = getField(extractions, 'county') ?? defaultCounty;
  const postalCode = getField(extractions, 'postal_code') ?? defaultPostalCode;
  const propertyTypeRaw = getField(extractions, 'property_type') ?? 'single_family';
  const validPropertyTypes = ['single_family', 'condo', 'co_op', 'townhouse', 'multi_family'] as const;
  const propertyType = validPropertyTypes.includes(propertyTypeRaw as typeof validPropertyTypes[number])
    ? (propertyTypeRaw as typeof validPropertyTypes[number])
    : 'single_family';

  const street2 = getField(extractions, 'street_2');
  // Expression index with coalesce is incompatible with PostgREST upsert onConflict.
  let propertyQuery = serviceClient
    .from('properties')
    .select('id')
    .eq('street_1', street1)
    .eq('city', city)
    .eq('state', propertyState)
    .eq('postal_code', postalCode);
  if (street2) {
    propertyQuery = propertyQuery.eq('street_2', street2);
  } else {
    propertyQuery = propertyQuery.is('street_2', null);
  }
  const { data: existingProperty } = await propertyQuery.limit(1).single();

  let propertyId: string;
  if (existingProperty) {
    propertyId = (existingProperty as { id: string }).id;
  } else {
    const { data: insertedProperty, error: propInsertErr } = await serviceClient
      .from('properties')
      .insert({
        street_1: street1,
        street_2: street2,
        city,
        state: propertyState,
        postal_code: postalCode,
        county,
        municipality: getField(extractions, 'municipality'),
        school_district: getField(extractions, 'school_district'),
        tax_parcel_id: getField(extractions, 'tax_parcel_id'),
        mls_number: getField(extractions, 'mls_number'),
        zoning: getField(extractions, 'zoning'),
        property_type: propertyType,
        bedrooms: getNumeric(extractions, 'bedrooms') || null,
        bathrooms: getNumeric(extractions, 'bathrooms') || null,
        year_built: getNumeric(extractions, 'year_built') || null,
        legal_description: getField(extractions, 'legal_description') ?? `Lot and parcel at ${street1}, ${city}, ${propertyState} ${postalCode}`,
        has_public_road_access: getBool(extractions, 'has_public_road_access'),
        delivered_vacant: getBool(extractions, 'delivered_vacant'),
        as_is_sale: getBool(extractions, 'as_is_sale'),
      } as never)
      .select('id')
      .single();
    if (propInsertErr) {
      console.error('Property insert failed:', propInsertErr.message, {
        street_1: street1, city, state: propertyState, postal_code: postalCode,
      });
    }
    propertyId = (insertedProperty as { id: string } | null)?.id ?? '';
  }

  if (!propertyId) {
    return NextResponse.json({ error: 'Failed to resolve property.' }, { status: 500 });
  }

  const purchasePrice = getNumeric(extractions, 'purchase_price');
  const downpayment = getNumeric(extractions, 'downpayment_amount');
  // Prefer the PDF's stated balance over computing it. The PAR Form ASR has an
  // explicit "Remaining Balance at Settlement" line; computing as
  // (price - downpayment) breaks when downpayment is missing (the PAR form
  // doesn't include a "Down Payment" line item — see project memory).
  const extractedBalance = getNumeric(extractions, 'balance_due_at_closing');
  const balance = extractedBalance > 0
    ? extractedBalance
    : (purchasePrice > 0 ? purchasePrice - downpayment : 0);

  const fundsRaw = getField(extractions, 'acceptable_funds') ?? 'certified_check';
  const validFunds = ['cash', 'certified_check', 'official_bank_check', 'wire', 'other'] as const;
  const acceptableFunds = validFunds.includes(fundsRaw as typeof validFunds[number])
    ? (fundsRaw as typeof validFunds[number])
    : 'certified_check';

  const contractInsert: ContractInsert = {
    contract_number: generateContractNumber(propertyState),
    property_id: propertyId,
    seller_id: sellerId,
    purchaser_id: purchaserId,
    status: 'draft',
    contract_date: getField(extractions, 'contract_date') ?? new Date().toISOString().split('T')[0],
    closing_date: getField(extractions, 'closing_date') ?? getField(extractions, 'settlement_date'),
    commitment_date: getField(extractions, 'commitment_date'),
    purchase_price: purchasePrice || 100000,
    downpayment_amount: downpayment,
    balance_due_at_closing: balance,
    acceptable_funds: acceptableFunds,
    subject_to_mortgage_contingency: getBool(extractions, 'subject_to_mortgage_contingency'),
    title_company_name: getField(extractions, 'title_company_name'),
    seller_has_right_to_sell: getBool(extractions, 'seller_has_right_to_sell'),
    seller_not_foreign_person: getBool(extractions, 'seller_not_foreign_person'),
    no_undisclosed_abatements: getBool(extractions, 'no_undisclosed_abatements'),
    title_insurable: getBool(extractions, 'title_insurable'),
    premises_broom_clean: getBool(extractions, 'premises_broom_clean'),
    systems_in_working_order: getBool(extractions, 'systems_in_working_order'),
    smoke_detector_affidavit_required: getBool(extractions, 'smoke_detector_affidavit_required'),
    certificate_of_occupancy_required: getBool(extractions, 'certificate_of_occupancy_required'),
    firpta_cert_required: getBool(extractions, 'firpta_cert_required'),
    // PA-specific fields ───────────────────────────────────────────────────
    initial_deposit_amount: getNumeric(extractions, 'initial_deposit_amount') || null,
    additional_deposit_amount: getNumeric(extractions, 'additional_deposit_amount') || null,
    seller_assist_amount: getNumeric(extractions, 'seller_assist_amount') || null,
    mortgage_term_years: getNumeric(extractions, 'mortgage_term_years') || null,
    pre_approval_letter_date: getField(extractions, 'pre_approval_letter_date'),
    inspection_contingency_days: getNumeric(extractions, 'inspection_contingency_days') || null,
    inspection_deadline: getField(extractions, 'inspection_deadline'),
    home_inspection_elected: getBool(extractions, 'home_inspection_elected'),
    wood_destroying_insect_inspection_elected: getBool(extractions, 'wood_destroying_insect_inspection_elected'),
    radon_inspection_elected: getBool(extractions, 'radon_inspection_elected'),
    mold_inspection_elected: getBool(extractions, 'mold_inspection_elected'),
    water_quality_inspection_elected: getBool(extractions, 'water_quality_inspection_elected'),
    septic_inspection_elected: getBool(extractions, 'septic_inspection_elected'),
    lead_based_paint_inspection_elected: getBool(extractions, 'lead_based_paint_inspection_elected'),
    boundary_survey_elected: getBool(extractions, 'boundary_survey_elected'),
    settlement_time: getField(extractions, 'settlement_time'),
    settlement_location: getField(extractions, 'settlement_location'),
    pa_realty_transfer_tax_seller: getNumeric(extractions, 'pa_realty_transfer_tax_seller') || null,
    pa_realty_transfer_tax_buyer: getNumeric(extractions, 'pa_realty_transfer_tax_buyer') || null,
    local_transfer_tax: getNumeric(extractions, 'local_transfer_tax') || null,
    water_source: getField(extractions, 'water_source'),
    sewage_disposal: getField(extractions, 'sewage_disposal'),
    megan_law_notice_acknowledged: getBool(extractions, 'megan_law_notice_acknowledged'),
    source_document_id: documentId,
    org_id: doc.org_id,
  };

  const { data: contractRow, error: contractError } = await serviceClient
    .from('contracts')
    .insert(contractInsert as never)
    .select('*')
    .single();

  if (contractError || !contractRow) {
    console.error('Contract insert failed:', contractError?.message);
    return NextResponse.json({ error: 'Failed to create contract.' }, { status: 500 });
  }

  const contract = contractRow as Database['public']['Tables']['contracts']['Row'];

  // Backfill risk_flags.contract_id for flags inserted during the AOS upload
  // (the contract didn't exist yet at that moment). This lets the transaction
  // page query risk_flags by contract_id directly.
  await serviceClient
    .from('risk_flags')
    .update({ contract_id: contract.id } as never)
    .eq('document_id', documentId)
    .is('contract_id', null);

  await serviceClient
    .from('documents')
    .update({ contract_id: contract.id } as never)
    .eq('id', documentId);

  const mortgagePrincipal = getNumeric(extractions, 'principal_amount');
  if (mortgagePrincipal > 0) {
    await serviceClient
      .from('contract_mortgages')
      .insert({
        contract_id: contract.id,
        mortgage_type: 'institutional',
        lender_name: getField(extractions, 'lender_name'),
        principal_amount: mortgagePrincipal,
        interest_rate: getNumeric(extractions, 'interest_rate') || null,
        monthly_payment: getNumeric(extractions, 'monthly_payment') || null,
        escrow_required: getBool(extractions, 'escrow_required'),
        commitment_received: getBool(extractions, 'commitment_received'),
      } as never);
  }

  // Default escrow amount to downpayment if not explicitly extracted
  const escrowAmount = getNumeric(extractions, 'amount_held') || downpayment;
  // PAR Form ASR Paragraph 11 always labels the "Escrow Agent:" inline. Claude
  // sometimes drops this field or returns an empty string on a noisy run, so
  // fall back to a regex over the LlamaParse markdown before degrading to
  // seller_attorney_name. `??` would not catch empty strings, so trim + null.
  const nullIfBlank = (v: string | null | undefined): string | null => {
    const t = (v ?? '').trim();
    return t.length > 0 ? t : null;
  };
  const extractAgentFromText = (text: string | null): string | null => {
    if (!text) return null;
    if (text.startsWith('[PDF document analyzed directly')) return null;
    const m = text.match(
      /Escrow\s*Agent\s*[:|]\s*\|?\s*([A-Z][A-Za-z'.\- ]{1,60}?)(?=\s*(?:\||\n|Escrow\s*Company|Escrow\s*Account|Escrow\s*Amount|$))/i
    );
    const name = m?.[1]?.trim();
    return name && name.length > 1 ? name : null;
  };
  const escrowAgentFromExtraction = nullIfBlank(getField(extractions, 'escrow_agent_name'));
  const escrowAgentFromRawText = escrowAgentFromExtraction
    ? null
    : extractAgentFromText(doc.raw_text);
  const escrowAgent = escrowAgentFromExtraction
    ?? escrowAgentFromRawText
    ?? nullIfBlank(getField(extractions, 'seller_attorney_name'));
  const bankName = getField(extractions, 'bank_name') || 'TBD — Attorney Trust Account';

  if (escrowAmount > 0) {
    let escrowAgentId = sellerId;
    if (escrowAgent) {
      const { data: agentRow } = await serviceClient
        .from('people')
        .insert({
          first_name: escrowAgent.split(' ')[0] || escrowAgent,
          last_name: escrowAgent.split(' ').slice(1).join(' ') || 'Escrow',
          email: `escrow.${Date.now()}@pending.estora.app`,
          city: city,
          state: propertyState,
        } as never)
        .select('id')
        .single();
      if (agentRow) escrowAgentId = (agentRow as { id: string }).id;
    }

    await serviceClient
      .from('contract_escrow')
      .insert({
        contract_id: contract.id,
        escrow_agent_id: escrowAgentId,
        bank_name: bankName,
        account_reference: getField(extractions, 'account_reference') ?? 'TBD',
        amount_held: escrowAmount,
        segregated_account: getBool(extractions, 'segregated_account'),
      } as never);
  }

  // Build extracted dates map from PDF extractions for timeline overrides
  const dateFieldKeys = [
    'contract_date', 'closing_date', 'commitment_date',
    'initial_deposit_due_date',
    'inspection_deadline', 'attorney_review_deadline',
    'mortgage_application_deadline', 'appraisal_deadline',
    'title_search_deadline', 'certificate_of_occupancy_deadline',
  ];
  const extractedDates: ExtractedDates = {};
  for (const key of dateFieldKeys) {
    const val = getField(extractions, key);
    if (val) extractedDates[key] = val;
  }

  try {
    const timelineTemplate = isNY ? 'ny_residential' : 'pa_residential';
    await generateDefaultTimeline(serviceClient, contract.id, contract.closing_date, timelineTemplate, extractedDates);
    // Auto-complete "Execute contract" — the AOS was already signed when uploaded.
    // Update both the task and the timeline_item; the timeline view marks an
    // entry as Overdue based on completed_at IS NULL, not on tasks.status.
    const completedAt = new Date().toISOString();
    await serviceClient
      .from('tasks')
      .update({ status: 'done', completed_at: completedAt } as never)
      .eq('contract_id', contract.id)
      .eq('title', 'Execute contract');
    await serviceClient
      .from('timeline_items')
      .update({ completed_at: completedAt } as never)
      .eq('contract_id', contract.id)
      .eq('label', 'Execute contract');
  } catch (err) {
    console.error('Timeline generation failed:', err);
  }

  // Run the rules engine on the AOS itself so PA-AOS boilerplate flags
  // (3-day Corrective Proposal response, smoke-detector affidavit, etc.) fire
  // on day one, not only after a disclosure is later attached. The same
  // engine runs again on disclosure upload to layer on SPD-/LBP-derived
  // tasks; topic-keyword dedup ensures no double-emission.
  try {
    await applyDisclosureRules(serviceClient, contract.id, documentId);
  } catch (err) {
    console.error('Disclosure rules (AOS path) failed:', err);
  }

  try {
    const health = await computeHealthScore(serviceClient, contract.id);
    await serviceClient
      .from('contracts')
      .update({
        health_score: health.score,
        health_status: health.status,
      } as never)
      .eq('id', contract.id);
  } catch (err) {
    console.error('Health computation failed:', err);
  }

  const { data: membershipRows } = await serviceClient
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1);

  const orgId = (membershipRows as Array<{ org_id: string }> | null)?.[0]?.org_id;
  if (orgId) {
    await createAuditEvent(serviceClient, {
      orgId,
      actorId: user.id,
      action: 'contract.created_from_document',
      entityType: 'contract',
      entityId: contract.id,
      detail: {
        documentId,
        contractNumber: contract.contract_number,
      },
    });
  }

  return NextResponse.json({
    id: contract.id,
    contractNumber: contract.contract_number,
    status: contract.status,
  });
}
