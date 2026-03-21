import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { computeHealthScore } from '@/lib/services/health-service';
import { createAuditEvent } from '@/lib/services/audit-service';

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'overdue'] as const;
type TaskStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const supabase = createClient();
  const { userId } = await requireAuth(supabase);

  const body = await request.json();
  const newStatus = body.status as string;

  if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', params.taskId)
    .eq('contract_id', params.id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const oldStatus = existing.status;

  const { data: updated, error: updateErr } = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', params.taskId)
    .select('*')
    .single();

  if (updateErr) {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }

  await createAuditEvent(supabase, {
    orgId: '',
    actorId: userId,
    action: 'task.status_changed',
    entityType: 'task',
    entityId: params.taskId,
    fieldName: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    detail: { contractId: params.id },
  });

  const health = await computeHealthScore(supabase, params.id);

  await supabase
    .from('contracts')
    .update({
      health_score: health.score,
      health_status: health.status,
    })
    .eq('id', params.id);

  return NextResponse.json({ task: updated, health });
}
