import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { createAuditEvent } from '@/lib/services/audit-service';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { userId } = await requireAuth(supabase);

  const body = await request.json();
  const { entityType, entityId, fieldName } = body as {
    entityType?: string;
    entityId?: string;
    fieldName?: string;
  };

  if (!fieldName) {
    return NextResponse.json({ error: 'fieldName required' }, { status: 400 });
  }

  await createAuditEvent(supabase, {
    orgId: '',
    actorId: userId,
    action: 'pii.revealed',
    entityType: entityType ?? 'unknown',
    entityId: entityId ?? null,
    fieldName,
    detail: {
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
      userAgent: request.headers.get('user-agent')?.slice(0, 200) ?? 'unknown',
    },
  });

  return NextResponse.json({ ok: true });
}
