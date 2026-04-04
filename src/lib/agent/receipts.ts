import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole, PolicyDecision, SecurityReceipt, SkillName } from './types';

type TypedClient = SupabaseClient<Database>;

export interface LogReceiptInput {
  transactionId: string;
  userId: string | null;
  role: AgentRole;
  request: string;
  skillRequested: SkillName;
  decision: PolicyDecision;
  reason: string;
  approvedBy?: string | null;
  attackCaseId?: string | null;
}

export async function logReceipt(
  supabase: TypedClient,
  input: LogReceiptInput
): Promise<string> {
  const { data, error } = await supabase
    .from('agent_receipts')
    .insert({
      transaction_id: input.transactionId,
      user_id: input.userId,
      role: input.role,
      request: input.request,
      skill_requested: input.skillRequested,
      decision: input.decision,
      reason: input.reason,
      approved_by: input.approvedBy ?? null,
      attack_case_id: input.attackCaseId ?? null,
    } as never)
    .select('id')
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export async function getReceiptsForTransaction(
  supabase: TypedClient,
  transactionId: string,
  limit = 50
): Promise<SecurityReceipt[]> {
  const { data, error } = await supabase
    .from('agent_receipts')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    transactionId: row.transaction_id as string,
    userId: row.user_id as string,
    role: row.role as AgentRole,
    request: row.request as string,
    skillRequested: row.skill_requested as SkillName,
    decision: row.decision as PolicyDecision,
    reason: (row.reason as string) ?? '',
    approvedBy: (row.approved_by as string) ?? null,
    attackCaseId: (row.attack_case_id as string) ?? null,
    createdAt: row.created_at as string,
  }));
}
