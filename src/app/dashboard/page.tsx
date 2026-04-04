import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import DocumentDropzone from '@/components/DocumentDropzone';
import DealList from '@/components/DealList';
import RealtimeRefresh from '@/components/RealtimeRefresh';
import { DealTableSkeleton } from '@/components/ui/Skeleton';
import { getUserOrgs } from '@/lib/auth-helpers';
import type { ContractWithRelations } from '@/lib/types';

async function DealListLoader() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  // Get the user's org IDs so we can scope the query
  const orgs = await getUserOrgs(supabase);
  const orgIds = orgs.map((o) => o.orgId);

  if (orgIds.length === 0) {
    return <DealList deals={[]} />;
  }

  // Use service client to bypass RLS on properties/people joins,
  // but scope to the user's orgs for security.
  // Include contracts with matching org_id OR null org_id (seed data).
  const { data, error } = await serviceClient
    .from('contracts')
    .select(
      `
      *,
      property:properties!property_id (*),
      seller:people!seller_id (*),
      purchaser:people!purchaser_id (*)
    `
    )
    .in('org_id', orgIds)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to load contracts:', error.message);
  }

  const deals = (data ?? []) as unknown as ContractWithRelations[];

  return <DealList deals={deals} />;
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-navy mb-1">Dashboard</h1>
        <p className="text-sm text-secondary">
          Upload agreements and manage your active deals
        </p>
      </div>

      <DocumentDropzone />

      <RealtimeRefresh table="contracts" />

      <Suspense fallback={<DealTableSkeleton />}>
        <DealListLoader />
      </Suspense>
    </div>
  );
}
