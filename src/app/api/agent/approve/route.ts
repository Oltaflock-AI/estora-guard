import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { logReceipt } from '@/lib/agent/receipts';
import { requestPiiReveal } from '@/lib/skills/request-pii-reveal';
import type { AgentRole, ChatResponse, PolicyDecision, SkillName } from '@/lib/agent/types';

export async function POST(request: NextRequest) {
  try {
    const authClient = createClient();
    const { userId } = await requireAuth(authClient);

    const body = await request.json();
    const { pendingActionId, transactionId, role } = body as {
      pendingActionId?: string;
      transactionId?: string;
      role?: AgentRole;
    };

    if (!pendingActionId || !transactionId || !role) {
      return NextResponse.json(
        { error: 'pendingActionId, transactionId, and role are required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Look up the pending receipt
    const { data: pendingReceipt, error: lookupError } = await serviceClient
      .from('agent_receipts')
      .select('*')
      .eq('id', pendingActionId)
      .single();

    if (lookupError || !pendingReceipt) {
      return NextResponse.json(
        { error: 'Pending action not found' },
        { status: 404 }
      );
    }

    const receipt = pendingReceipt as Record<string, unknown>;

    if ((receipt.decision as PolicyDecision) !== 'approval_required') {
      return NextResponse.json(
        { error: 'This action is not pending approval' },
        { status: 400 }
      );
    }

    // Update the pending receipt with approved_by
    await serviceClient
      .from('agent_receipts')
      .update({ approved_by: userId } as never)
      .eq('id', pendingActionId);

    // Execute the skill (only request_pii_reveal requires approval in the MVP)
    const skillRequested = receipt.skill_requested as SkillName;
    let content = 'Action approved and executed.';

    if (skillRequested === 'request_pii_reveal') {
      const result = await requestPiiReveal(
        serviceClient,
        transactionId,
        role,
        userId
      );
      content = result.formatted;
    }

    // Log the final allowed receipt
    const finalReceiptId = await logReceipt(serviceClient, {
      transactionId,
      userId,
      role,
      request: receipt.request as string,
      skillRequested,
      decision: 'allowed',
      reason: `Approved by user ${userId}`,
      approvedBy: userId,
    });

    const response: ChatResponse = {
      content,
      skillInvoked: skillRequested,
      decision: 'allowed',
      receiptId: finalReceiptId,
      reason: `Approved by user ${userId}`,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[agent/approve]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
