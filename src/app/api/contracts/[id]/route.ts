import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const contractId = params.id;

  // Verify contract exists
  const { data: contract } = await serviceClient
    .from('contracts')
    .select('id')
    .eq('id', contractId)
    .single();

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found.' }, { status: 404 });
  }

  // Delete related rows in dependency order
  await serviceClient.from('tasks').delete().eq('contract_id', contractId);
  await serviceClient.from('timeline_items').delete().eq('contract_id', contractId);
  await serviceClient.from('contract_mortgages').delete().eq('contract_id', contractId);
  await serviceClient.from('contract_escrow').delete().eq('contract_id', contractId);

  // Unlink any documents pointing to this contract
  await serviceClient
    .from('documents')
    .update({ contract_id: null } as never)
    .eq('contract_id', contractId);

  // Delete the contract itself
  const { error } = await serviceClient
    .from('contracts')
    .delete()
    .eq('id', contractId);

  if (error) {
    console.error('Contract delete failed:', error.message);
    return NextResponse.json({ error: 'Failed to delete contract.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
