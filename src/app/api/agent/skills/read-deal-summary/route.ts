import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { readDealSummary } from '@/lib/skills/read-deal-summary';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');

    if (!contractId) {
      return NextResponse.json(
        { error: 'contractId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const result = await readDealSummary(supabase, contractId, 'transaction_coordinator');

    return NextResponse.json({
      summary: result.summary,
      formatted: result.formatted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[agent/skills/read-deal-summary]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
