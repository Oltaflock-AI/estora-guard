import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
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
  Document,
} from '@/lib/types';
import TransactionDetail from './TransactionDetail';

async function getTransaction(id: string) {
  const supabase = createServiceClient();

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

  const { data: contractDocuments } = await supabase
    .from('documents')
    .select('*')
    .eq('contract_id', id)
    .order('created_at', { ascending: false });

  const documents = (contractDocuments ?? []) as Document[];

  const documentIds = documents.map((d) => d.id);
  if (
    contract.source_document_id &&
    !documentIds.includes(contract.source_document_id)
  ) {
    documentIds.push(contract.source_document_id);
  }

  let riskFlags: RiskFlag[] = [];
  if (documentIds.length > 0) {
    const { data: flags } = await supabase
      .from('risk_flags')
      .select('*')
      .in('document_id', documentIds);
    riskFlags = (flags ?? []) as RiskFlag[];
    const severityOrder = { high: 0, medium: 1, low: 2 } as const;
    riskFlags.sort((a, b) => {
      const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 3;
      const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 3;
      if (sa !== sb) return sa - sb;
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
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
    documents,
    health,
  };
}

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTransaction(id);
  if (!data) notFound();

  return <TransactionDetail data={data} />;
}
