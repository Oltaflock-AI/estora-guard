import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { classifyIntent } from '@/lib/agent/orchestrator';
import { evaluatePolicy } from '@/lib/agent/policy';
import { logReceipt } from '@/lib/agent/receipts';
import type { AgentRole, ChatResponse, SkillName } from '@/lib/agent/types';
import { readDealSummary } from '@/lib/skills/read-deal-summary';
import { readRiskFlags } from '@/lib/skills/read-risk-flags';
import { readTimeline } from '@/lib/skills/read-timeline';
import { readTaskList } from '@/lib/skills/read-task-list';
import { draftNextActions } from '@/lib/skills/draft-next-actions';
import { requestPiiReveal } from '@/lib/skills/request-pii-reveal';

async function executeSkill(
  supabase: ReturnType<typeof createServiceClient>,
  skillName: SkillName,
  contractId: string,
  role: AgentRole,
  userId: string | null
): Promise<string> {
  switch (skillName) {
    case 'read_deal_summary': {
      const result = await readDealSummary(supabase, contractId, role);
      return result.formatted;
    }
    case 'read_risk_flags': {
      const result = await readRiskFlags(supabase, contractId, role);
      return result.formatted;
    }
    case 'read_timeline': {
      const result = await readTimeline(supabase, contractId, role);
      return result.formatted;
    }
    case 'read_task_list': {
      const result = await readTaskList(supabase, contractId, role);
      return result.formatted;
    }
    case 'draft_next_actions': {
      const result = await draftNextActions(supabase, contractId, role);
      return result.formatted;
    }
    case 'request_pii_reveal': {
      const result = await requestPiiReveal(supabase, contractId, role, userId);
      return result.formatted;
    }
    default:
      return 'Unknown skill requested.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = createClient();
    const { userId } = await requireAuth(authClient);

    const body = await request.json();
    const { message, transactionId, role, approvedActionId } = body as {
      message?: string;
      transactionId?: string;
      role?: AgentRole;
      approvedActionId?: string;
    };

    if (!message || !transactionId || !role) {
      return NextResponse.json(
        { error: 'message, transactionId, and role are required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Step 1: Classify intent
    const intent = classifyIntent(message);

    // Step 2: Evaluate policy
    const policyResult = evaluatePolicy(intent.skillName, role, {
      message,
      approvedActionId,
    });

    // Step 3: Log receipt
    const receiptId = await logReceipt(serviceClient, {
      transactionId,
      userId,
      role,
      request: message,
      skillRequested: intent.skillName,
      decision: policyResult.decision,
      reason: policyResult.reason,
    });

    // Step 4: Handle policy decision
    if (policyResult.decision === 'denied') {
      const response: ChatResponse = {
        content: `**Request Denied**\n\n${policyResult.reason}\n\nThis action has been logged.`,
        skillInvoked: intent.skillName,
        decision: 'denied',
        receiptId,
        reason: policyResult.reason,
      };
      return NextResponse.json(response);
    }

    if (policyResult.decision === 'approval_required') {
      const response: ChatResponse = {
        content: `**Approval Required**\n\nThis action requires human approval before it can be executed.\n\nReason: ${policyResult.reason}`,
        skillInvoked: intent.skillName,
        decision: 'approval_required',
        receiptId,
        requiresApproval: true,
        pendingActionId: receiptId,
        reason: policyResult.reason,
      };
      return NextResponse.json(response);
    }

    // Step 5: Execute skill
    const content = await executeSkill(
      serviceClient,
      intent.skillName,
      transactionId,
      role,
      userId
    );

    const response: ChatResponse = {
      content,
      skillInvoked: intent.skillName,
      decision: 'allowed',
      receiptId,
      reason: policyResult.reason,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[agent/chat]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
