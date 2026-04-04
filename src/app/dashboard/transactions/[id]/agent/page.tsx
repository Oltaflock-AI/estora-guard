import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import type { Contract, Property } from '@/lib/types';
import AgentPanel from '@/components/agent/AgentPanel';
import NemoClawBanner from '@/components/agent/NemoClawBanner';
import { ArrowLeft, Bot } from 'lucide-react';
import Link from 'next/link';

async function getTransactionBasics(id: string) {
  const supabase = createServiceClient();

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !contract) return null;
  const c = contract as Contract;

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', c.property_id)
    .single();

  return {
    contract: c,
    property: property as Property | null,
  };
}

export default async function AgentPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getTransactionBasics(params.id);
  if (!data) notFound();

  const { contract, property } = data;
  const address = property
    ? `${property.street_1}, ${property.city}`
    : contract.contract_number;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/dashboard/transactions/${params.id}`}
          className="text-secondary hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-navy">Estora Guard Agent</h1>
            <p className="text-sm text-secondary">
              {address} &middot; {contract.contract_number}
            </p>
          </div>
        </div>
      </div>

      <NemoClawBanner />

      <div className="card min-h-[600px] flex flex-col">
        <AgentPanel transactionId={params.id} />
      </div>
    </div>
  );
}
