import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createAuditEvent } from '@/lib/services/audit-service';
import type { Database } from '@/lib/supabase/database.types';

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

  const flagId = params.id;

  let body: { note?: string } = {};
  try {
    body = await request.json();
  } catch {
    // note is optional
  }

  const { data: flagRow, error: fetchError } = await serviceClient
    .from('risk_flags')
    .select('*')
    .eq('id', flagId)
    .single();

  if (fetchError || !flagRow) {
    return NextResponse.json({ error: 'Risk flag not found.' }, { status: 404 });
  }

  const flag = flagRow as Database['public']['Tables']['risk_flags']['Row'];

  if (flag.acknowledged) {
    return NextResponse.json({
      id: flag.id,
      acknowledged: true,
      message: 'Already acknowledged.',
    });
  }

  const { error: updateError } = await serviceClient
    .from('risk_flags')
    .update({
      acknowledged: true,
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
      acknowledged_note: body.note ?? null,
    } as never)
    .eq('id', flagId);

  if (updateError) {
    console.error('Risk flag acknowledge failed:', updateError.message);
    return NextResponse.json({ error: 'Failed to acknowledge risk flag.' }, { status: 500 });
  }

  const { data: docRow } = await serviceClient
    .from('documents')
    .select('org_id')
    .eq('id', flag.document_id)
    .single();

  const orgId = (docRow as { org_id: string } | null)?.org_id;
  if (orgId) {
    await createAuditEvent(serviceClient, {
      orgId,
      actorId: user.id,
      action: 'risk_flag.acknowledged',
      entityType: 'risk_flag',
      entityId: flagId,
      detail: {
        flagType: flag.flag_type,
        severity: flag.severity,
        title: flag.title,
        note: body.note ?? null,
      },
    });
  }

  return NextResponse.json({
    id: flagId,
    acknowledged: true,
    acknowledgedAt: new Date().toISOString(),
  });
}
