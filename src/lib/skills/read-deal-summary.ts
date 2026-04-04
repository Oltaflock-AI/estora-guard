import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole } from '@/lib/agent/types';
import { computeHealthScore } from '@/lib/services/health-service';
import type {
  Contract,
  Property,
  Person,
  ContractMortgage,
  ContractEscrow,
  RiskFlag,
} from '@/lib/types';

type TypedClient = SupabaseClient<Database>;

export interface DealSummary {
  contractId: string;
  contractNumber: string;
  status: string;
  property: {
    address: string;
    city: string;
    county: string;
    type: string;
  };
  seller: string;
  purchaser: string;
  purchasePrice: number;
  downpayment: number;
  closingDate: string | null;
  healthScore: number;
  healthStatus: string;
  healthReasons: string[];
  topRisks: { title: string; severity: string }[];
  mortgageCount: number;
  hasEscrow: boolean;
}

function formatPersonName(person: Person): string {
  return `${person.first_name} ${person.last_name}`;
}

export async function readDealSummary(
  supabase: TypedClient,
  contractId: string,
  _role: AgentRole
): Promise<{ summary: DealSummary; formatted: string }> {
  const { data: contract, error: cErr } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .single();

  if (cErr || !contract) {
    throw new Error(`Contract ${contractId} not found`);
  }
  const c = contract as Contract;

  const [
    { data: rawProperty },
    { data: rawSeller },
    { data: rawPurchaser },
    { data: rawMortgages },
    { data: rawEscrow },
  ] = await Promise.all([
    supabase.from('properties').select('*').eq('id', c.property_id).single(),
    supabase.from('people').select('*').eq('id', c.seller_id).single(),
    supabase.from('people').select('*').eq('id', c.purchaser_id).single(),
    supabase.from('contract_mortgages').select('*').eq('contract_id', contractId),
    supabase.from('contract_escrow').select('*').eq('contract_id', contractId).limit(1),
  ]);

  const property = rawProperty as Property;
  const seller = rawSeller as Person;
  const purchaser = rawPurchaser as Person;
  const mortgages = (rawMortgages ?? []) as ContractMortgage[];
  const escrow = ((rawEscrow ?? []) as ContractEscrow[])[0] ?? null;

  // Get risk flags through documents linked to this contract
  const { data: rawDocs } = await supabase
    .from('documents')
    .select('id')
    .eq('contract_id', contractId);

  const docIds = ((rawDocs ?? []) as Array<{ id: string }>).map((d) => d.id);
  let topRisks: { title: string; severity: string }[] = [];

  if (docIds.length > 0) {
    const { data: rawFlags } = await supabase
      .from('risk_flags')
      .select('*')
      .in('document_id', docIds)
      .order('severity', { ascending: true })
      .limit(3);

    topRisks = ((rawFlags ?? []) as RiskFlag[]).map((f) => ({
      title: f.title,
      severity: f.severity,
    }));
  }

  const health = await computeHealthScore(supabase, contractId);

  const summary: DealSummary = {
    contractId,
    contractNumber: c.contract_number,
    status: c.status,
    property: {
      address: property.street_1,
      city: property.city,
      county: property.county,
      type: property.property_type,
    },
    seller: formatPersonName(seller),
    purchaser: formatPersonName(purchaser),
    purchasePrice: Number(c.purchase_price),
    downpayment: Number(c.downpayment_amount),
    closingDate: c.closing_date,
    healthScore: health.score,
    healthStatus: health.status,
    healthReasons: health.reasons,
    topRisks,
    mortgageCount: mortgages.length,
    hasEscrow: escrow !== null,
  };

  const riskLines =
    topRisks.length > 0
      ? topRisks.map((r) => `  - [${r.severity.toUpperCase()}] ${r.title}`).join('\n')
      : '  No active risk flags.';

  const formatted = [
    `## Deal Summary — ${c.contract_number}`,
    '',
    `**Property:** ${property.street_1}, ${property.city}, ${property.county} County, NY`,
    `**Type:** ${property.property_type}`,
    `**Seller:** ${formatPersonName(seller)}`,
    `**Purchaser:** ${formatPersonName(purchaser)}`,
    `**Purchase Price:** $${Number(c.purchase_price).toLocaleString()}`,
    `**Down Payment:** $${Number(c.downpayment_amount).toLocaleString()}`,
    `**Closing Date:** ${c.closing_date ?? 'TBD'}`,
    `**Status:** ${c.status}`,
    '',
    `**Health Score:** ${health.score}/100 (${health.status})`,
    ...health.reasons.map((r) => `  - ${r}`),
    '',
    `**Top Risk Flags:**`,
    riskLines,
  ].join('\n');

  return { summary, formatted };
}
