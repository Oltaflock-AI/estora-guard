import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/database.types';
import type { AuditEvent } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;

export interface CreateAuditEventInput {
  orgId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  detail?: Record<string, unknown> | null;
}

export async function createAuditEvent(
  supabase: TypedClient,
  input: CreateAuditEventInput
): Promise<void> {
  const row: Database['public']['Tables']['audit_events']['Insert'] = {
    org_id: input.orgId,
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    field_name: input.fieldName ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    detail: (input.detail ?? null) as Json,
  };

  const { error } = await supabase
    .from('audit_events')
    .insert(row as never);

  if (error) throw error;
}

export interface ListAuditEventsOptions {
  orgId?: string;
  contractId?: string;
  entityType?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditEvents(
  supabase: TypedClient,
  opts: ListAuditEventsOptions
): Promise<{ events: AuditEvent[]; total: number }> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (opts.orgId) {
    query = query.eq('org_id', opts.orgId);
  }

  if (opts.entityType) {
    query = query.eq('entity_type', opts.entityType);
  }

  if (opts.action) {
    query = query.eq('action', opts.action);
  }

  if (opts.contractId) {
    query = query.eq('entity_type', 'contract').eq('entity_id', opts.contractId);
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    events: (data ?? []) as AuditEvent[],
    total: count ?? 0,
  };
}

export async function listAuditEventsForContract(
  supabase: TypedClient,
  contractId: string
): Promise<AuditEvent[]> {
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('contract_id', contractId);

  const taskIds = ((rawTasks ?? []) as Array<{ id: string }>).map((t) => t.id);
  const entityIds = [contractId, ...taskIds];

  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .in('entity_id', entityIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AuditEvent[];
}
