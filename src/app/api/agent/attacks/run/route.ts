import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { classifyIntent } from '@/lib/agent/orchestrator';
import { evaluatePolicy } from '@/lib/agent/policy';
import { logReceipt } from '@/lib/agent/receipts';
import { ATTACKS } from '@/lib/agent/attacks';

export async function POST(request: NextRequest) {
  try {
    const authClient = createClient();
    const { userId } = await requireAuth(authClient);

    const body = await request.json();
    const { attackId, transactionId } = body as {
      attackId?: string;
      transactionId?: string;
    };

    if (!attackId) {
      return NextResponse.json(
        { error: 'attackId is required' },
        { status: 400 }
      );
    }

    const attack = ATTACKS.find((a) => a.id === attackId);
    if (!attack) {
      return NextResponse.json(
        { error: `Attack case "${attackId}" not found` },
        { status: 404 }
      );
    }

    const serviceClient = createServiceClient();

    // Run the attack through the same pipeline as a normal chat message
    const intent = classifyIntent(attack.prompt);

    const policyResult = evaluatePolicy(intent.skillName, attack.role, {
      message: attack.prompt,
    });

    const txnId = transactionId ?? 'redteam-session';

    const receiptId = await logReceipt(serviceClient, {
      transactionId: txnId,
      userId,
      role: attack.role,
      request: attack.prompt,
      skillRequested: intent.skillName,
      decision: policyResult.decision,
      reason: policyResult.reason,
      attackCaseId: attack.id,
    });

    const passed = policyResult.decision === attack.expectedDecision;

    return NextResponse.json({
      attackId: attack.id,
      title: attack.title,
      category: attack.category,
      prompt: attack.prompt,
      role: attack.role,
      expectedDecision: attack.expectedDecision,
      actualDecision: policyResult.decision,
      reason: policyResult.reason,
      receiptId,
      passed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[agent/attacks/run]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
