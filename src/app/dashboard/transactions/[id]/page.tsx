import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/services/health-service';
import type {
  Contract,
  Person,
  Property,
  Task,
  TimelineItem,
  RiskFlag,
  ContractMortgage,
  ContractEscrow,
} from '@/lib/types';
import TransactionDetail from './TransactionDetail';

async function getTransaction(id: string) {
  const supabase = createClient();

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !contract) return null;

  const [
    { data: property },
    { data: seller },
    { data: purchaser },
    { data: sellerAttorney },
    { data: purchaserAttorney },
    { data: tasks },
    { data: timelineItems },
    { data: mortgages },
    { data: escrow },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .eq('id', contract.property_id)
      .single(),
    supabase
      .from('people')
      .select('*')
      .eq('id', contract.seller_id)
      .single(),
    supabase
      .from('people')
      .select('*')
      .eq('id', contract.purchaser_id)
      .single(),
    contract.seller_attorney_id
      ? supabase
          .from('people')
          .select('*')
          .eq('id', contract.seller_attorney_id)
          .single()
      : Promise.resolve({ data: null }),
    contract.purchaser_attorney_id
      ? supabase
          .from('people')
          .select('*')
          .eq('id', contract.purchaser_attorney_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('tasks')
      .select('*')
      .eq('contract_id', id)
      .order('due_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('timeline_items')
      .select('*')
      .eq('contract_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('contract_mortgages')
      .select('*')
      .eq('contract_id', id),
    supabase
      .from('contract_escrow')
      .select('*')
      .eq('contract_id', id)
      .maybeSingle(),
  ]);

  if (!property || !seller || !purchaser) return null;

  let riskFlags: RiskFlag[] = [];
  if (contract.source_document_id) {
    const { data: flags } = await supabase
      .from('risk_flags')
      .select('*')
      .eq('document_id', contract.source_document_id);
    riskFlags = (flags ?? []) as RiskFlag[];
  }

  const health = await computeHealthScore(supabase, id);

  return {
    contract: contract as Contract,
    property: property as Property,
    seller: seller as Person,
    purchaser: purchaser as Person,
    sellerAttorney: sellerAttorney as Person | null,
    purchaserAttorney: purchaserAttorney as Person | null,
    tasks: (tasks ?? []) as Task[],
    timelineItems: (timelineItems ?? []) as TimelineItem[],
    mortgages: (mortgages ?? []) as ContractMortgage[],
    escrow: escrow as ContractEscrow | null,
    riskFlags,
    health,
  };
}

export default async function TransactionPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getTransaction(params.id);
  if (!data) notFound();

  return <TransactionDetail data={data} />;
}
