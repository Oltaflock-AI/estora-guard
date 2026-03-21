import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateDefaultTimeline } from '@/lib/services/timeline-service';
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

function generateContractNumber(): string {
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `NYRCS-${seq}`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const documentId = params.id;

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

  const { data: sellerRow } = await serviceClient
    .from('people')
    .upsert(
      {
        first_name: sellerFirst,
        last_name: sellerLast,
        email: sellerEmail,
        city: getField(extractions, 'seller_city') ?? 'New York',
        state: 'NY',
        phone: getField(extractions, 'seller_phone'),
      } as never,
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  const { data: purchaserRow } = await serviceClient
    .from('people')
    .upsert(
      {
        first_name: purchaserFirst,
        last_name: purchaserLast,
        email: purchaserEmail,
        city: getField(extractions, 'purchaser_city') ?? 'New York',
        state: 'NY',
        phone: getField(extractions, 'purchaser_phone'),
      } as never,
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  const sellerId = (sellerRow as { id: string } | null)?.id;
  const purchaserId = (purchaserRow as { id: string } | null)?.id;

  if (!sellerId || !purchaserId) {
    return NextResponse.json({ error: 'Failed to resolve parties.' }, { status: 500 });
  }

  const street1 = getField(extractions, 'street_1') ?? '123 Main St';
  const city = getField(extractions, 'city') ?? 'New York';
  const county = getField(extractions, 'county') ?? 'New York';
  const postalCode = getField(extractions, 'postal_code') ?? '10001';
  const propertyTypeRaw = getField(extractions, 'property_type') ?? 'single_family';
  const validPropertyTypes = ['single_family', 'condo', 'co_op', 'townhouse', 'multi_family'] as const;
  const propertyType = validPropertyTypes.includes(propertyTypeRaw as typeof validPropertyTypes[number])
    ? (propertyTypeRaw as typeof validPropertyTypes[number])
    : 'single_family';

  const { data: propertyRow } = await serviceClient
    .from('properties')
    .upsert(
      {
        street_1: street1,
        street_2: getField(extractions, 'street_2'),
        city,
        state: 'NY',
        postal_code: postalCode,
        county,
        property_type: propertyType,
        bedrooms: getNumeric(extractions, 'bedrooms') || null,
        bathrooms: getNumeric(extractions, 'bathrooms') || null,
        year_built: getNumeric(extractions, 'year_built') || null,
        legal_description: getField(extractions, 'legal_description') ?? `Lot and parcel at ${street1}, ${city}, NY ${postalCode}`,
        has_public_road_access: getBool(extractions, 'has_public_road_access'),
        delivered_vacant: getBool(extractions, 'delivered_vacant'),
        as_is_sale: getBool(extractions, 'as_is_sale'),
      } as never,
      { onConflict: 'street_1,city,state,postal_code' }
    )
    .select('id')
    .single();

  const propertyId = (propertyRow as { id: string } | null)?.id;
  if (!propertyId) {
    return NextResponse.json({ error: 'Failed to resolve property.' }, { status: 500 });
  }

  const purchasePrice = getNumeric(extractions, 'purchase_price');
  const downpayment = getNumeric(extractions, 'downpayment_amount');
  const balance = purchasePrice > 0 ? purchasePrice - downpayment : 0;

  const fundsRaw = getField(extractions, 'acceptable_funds') ?? 'certified_check';
  const validFunds = ['cash', 'certified_check', 'official_bank_check', 'wire', 'other'] as const;
  const acceptableFunds = validFunds.includes(fundsRaw as typeof validFunds[number])
    ? (fundsRaw as typeof validFunds[number])
    : 'certified_check';

  const contractInsert: ContractInsert = {
    contract_number: generateContractNumber(),
    property_id: propertyId,
    seller_id: sellerId,
    purchaser_id: purchaserId,
    status: 'draft',
    contract_date: getField(extractions, 'contract_date') ?? new Date().toISOString().split('T')[0],
    closing_date: getField(extractions, 'closing_date'),
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
    source_document_id: documentId,
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

  const escrowAmount = getNumeric(extractions, 'amount_held');
  const escrowAgent = getField(extractions, 'escrow_agent_name');
  const bankName = getField(extractions, 'bank_name');

  if (escrowAmount > 0 && bankName) {
    let escrowAgentId = sellerId;
    if (escrowAgent) {
      const { data: agentRow } = await serviceClient
        .from('people')
        .upsert(
          {
            first_name: escrowAgent.split(' ')[0] || escrowAgent,
            last_name: escrowAgent.split(' ').slice(1).join(' ') || 'Escrow',
            email: `escrow.${Date.now()}@pending.estora.app`,
            city: city,
            state: 'NY',
          } as never,
          { onConflict: 'email' }
        )
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

  try {
    await generateDefaultTimeline(serviceClient, contract.id, contract.closing_date);
  } catch (err) {
    console.error('Timeline generation failed:', err);
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
