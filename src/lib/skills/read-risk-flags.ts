import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole } from '@/lib/agent/types';
import type { RiskFlag } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;

export interface RiskFlagResult {
  flags: RiskFlag[];
  formatted: string;
}

export async function readRiskFlags(
  supabase: TypedClient,
  contractId: string,
  role: AgentRole
): Promise<RiskFlagResult> {
  const { data: rawDocs } = await supabase
    .from('documents')
    .select('id')
    .eq('contract_id', contractId);

  const docIds = ((rawDocs ?? []) as Array<{ id: string }>).map((d) => d.id);

  if (docIds.length === 0) {
    return {
      flags: [],
      formatted: 'No documents linked to this transaction. No risk flags to display.',
    };
  }

  const { data: rawFlags, error } = await supabase
    .from('risk_flags')
    .select('*')
    .in('document_id', docIds)
    .order('severity', { ascending: true });

  if (error) throw error;
  const flags = (rawFlags ?? []) as RiskFlag[];

  if (flags.length === 0) {
    return { flags: [], formatted: 'No active risk flags for this transaction.' };
  }

  const roleFraming: Record<AgentRole, string> = {
    attorney: 'Legal review perspective — focus on clause ambiguity and compliance risks:',
    transaction_coordinator: 'Operational perspective — focus on deadline and process risks:',
    buyer_agent: 'Buyer impact perspective — focus on risks affecting your client:',
    seller_agent: 'Seller impact perspective — focus on risks affecting your client:',
  };

  const lines = [
    `## Risk Flags (${flags.length} active)`,
    '',
    roleFraming[role],
    '',
    ...flags.map((f, i) => {
      const ack = f.acknowledged
        ? `Acknowledged${f.acknowledged_by ? ` by ${f.acknowledged_by}` : ''}`
        : 'Not acknowledged';
      return [
        `### ${i + 1}. ${f.title}`,
        `**Severity:** ${f.severity} | **Type:** ${f.flag_type} | **Status:** ${ack}`,
        f.explanation,
        '',
      ].join('\n');
    }),
  ];

  return { flags, formatted: lines.join('\n') };
}
