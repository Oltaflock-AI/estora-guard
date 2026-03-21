import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createAuditEvent } from '@/lib/services/audit-service';

interface FieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

interface SavePayload {
  contractFields?: Record<string, unknown>;
  sellerFields?: Record<string, unknown>;
  purchaserFields?: Record<string, unknown>;
  propertyFields?: Record<string, unknown>;
  changes: FieldChange[];
}

export async function POST(
  request: NextRequest,
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

  const contractId = params.id;

  let body: SavePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { data: contractRow, error: fetchError } = await serviceClient
    .from('contracts')
    .select('*, property:properties!property_id(id), seller:people!seller_id(id), purchaser:people!purchaser_id(id)')
    .eq('id', contractId)
    .single();

  if (fetchError || !contractRow) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  const contract = contractRow as unknown as {
    id: string;
    status: string;
    property: { id: string };
    seller: { id: string };
    purchaser: { id: string };
  };

  if (contract.status === 'closed' || contract.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Cannot edit a closed or cancelled contract.' },
      { status: 403 }
    );
  }

  if (body.contractFields && Object.keys(body.contractFields).length > 0) {
    const { error } = await serviceClient
      .from('contracts')
      .update(body.contractFields as never)
      .eq('id', contractId);
    if (error) {
      console.error('Contract update failed:', error.message);
      return NextResponse.json({ error: 'Failed to save contract fields.' }, { status: 500 });
    }
  }

  if (body.sellerFields && Object.keys(body.sellerFields).length > 0) {
    const { error } = await serviceClient
      .from('people')
      .update(body.sellerFields as never)
      .eq('id', contract.seller.id);
    if (error) console.error('Seller update failed:', error.message);
  }

  if (body.purchaserFields && Object.keys(body.purchaserFields).length > 0) {
    const { error } = await serviceClient
      .from('people')
      .update(body.purchaserFields as never)
      .eq('id', contract.purchaser.id);
    if (error) console.error('Purchaser update failed:', error.message);
  }

  if (body.propertyFields && Object.keys(body.propertyFields).length > 0) {
    const { error } = await serviceClient
      .from('properties')
      .update(body.propertyFields as never)
      .eq('id', contract.property.id);
    if (error) console.error('Property update failed:', error.message);
  }

  const { data: membershipRows } = await serviceClient
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1);

  const orgId = (membershipRows as Array<{ org_id: string }> | null)?.[0]?.org_id;

  if (orgId && body.changes.length > 0) {
    for (const change of body.changes) {
      await createAuditEvent(serviceClient, {
        orgId,
        actorId: user.id,
        action: 'field.updated',
        entityType: 'contract',
        entityId: contractId,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
  }

  return NextResponse.json({
    saved: true,
    timestamp: new Date().toISOString(),
    changeCount: body.changes.length,
  });
}
