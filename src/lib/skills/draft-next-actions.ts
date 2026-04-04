import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole } from '@/lib/agent/types';
import { readDealSummary } from './read-deal-summary';
import { readRiskFlags } from './read-risk-flags';
import { readTaskList } from './read-task-list';

type TypedClient = SupabaseClient<Database>;

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;

const ROLE_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  buyer_agent: `You are a real estate transaction advisor for a buyer's agent. Focus on:
- Client-facing next steps and what to communicate to the buyer
- Contingency status and deadlines
- Risks that directly affect the buyer's position
- Items the buyer needs to provide or approve
Prioritize actions by urgency. Be concise and actionable.`,

  seller_agent: `You are a real estate transaction advisor for a seller's agent. Focus on:
- Seller deliverables and documents needed from the seller
- Closing preparation from the seller's side
- Risks or issues the seller needs to address
- Timeline items that depend on the seller
Prioritize actions by urgency. Be concise and actionable.`,

  attorney: `You are a real estate transaction advisor for an attorney. Focus on:
- Clause ambiguities and language that needs legal review
- Legal risks and compliance concerns
- Contingency review items and their status
- Items requiring legal attention or attorney sign-off
Prioritize by legal risk severity. Use precise legal framing.`,

  transaction_coordinator: `You are a real estate transaction advisor for a transaction coordinator. Focus on:
- Overdue items that need immediate attention
- Deadlines this week and next week
- Documents needed from any party
- What to chase and who to follow up with
Prioritize by deadline urgency. Be operational and specific.`,
};

export interface NextActionsResult {
  actions: string;
  formatted: string;
}

export async function draftNextActions(
  supabase: TypedClient,
  contractId: string,
  role: AgentRole
): Promise<NextActionsResult> {
  const [dealResult, riskResult, taskResult] = await Promise.all([
    readDealSummary(supabase, contractId, role),
    readRiskFlags(supabase, contractId, role),
    readTaskList(supabase, contractId, role),
  ]);

  const contextBlock = [
    dealResult.formatted,
    '',
    riskResult.formatted,
    '',
    taskResult.formatted,
  ].join('\n');

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: ROLE_SYSTEM_PROMPTS[role],
    messages: [
      {
        role: 'user',
        content: `Based on the following deal data, provide a prioritized list of next actions for my role.\n\n${contextBlock}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const actions = textBlock ? textBlock.text : 'Unable to generate recommendations.';

  return {
    actions,
    formatted: `## Recommended Next Actions (${role.replace('_', ' ')})\n\n${actions}`,
  };
}
