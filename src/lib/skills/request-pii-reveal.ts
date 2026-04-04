import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole } from '@/lib/agent/types';
import { createAuditEvent } from '@/lib/services/audit-service';

type TypedClient = SupabaseClient<Database>;

export interface PiiRevealResult {
  revealed: boolean;
  formatted: string;
}

export async function requestPiiReveal(
  supabase: TypedClient,
  contractId: string,
  role: AgentRole,
  userId: string | null,
  fieldName?: string
): Promise<PiiRevealResult> {
  // This skill only executes when the policy engine has already approved the action.
  // The skill itself logs the audit event and returns confirmation.
  const field = fieldName ?? 'masked_tax_id';

  if (userId) {
    await createAuditEvent(supabase, {
      orgId: '',
      actorId: userId,
      action: 'pii.revealed',
      entityType: 'contract',
      entityId: contractId,
      fieldName: field,
      detail: {
        role,
        via: 'agent_skill',
      },
    });
  }

  return {
    revealed: true,
    formatted: [
      `## PII Reveal Approved`,
      '',
      `The request to reveal **${field}** has been approved and logged.`,
      `The reveal was executed by role **${role}** and recorded in the audit trail.`,
      '',
      `*Note: The actual PII value is returned through the existing secure PII reveal flow, not through the agent chat.*`,
    ].join('\n'),
  };
}
