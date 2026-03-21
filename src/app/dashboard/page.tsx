import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import DocumentDropzone from '@/components/DocumentDropzone';
import DealList from '@/components/DealList';
import RealtimeRefresh from '@/components/RealtimeRefresh';
import { DealTableSkeleton } from '@/components/ui/Skeleton';
import type { ContractWithRelations } from '@/lib/types';

async function DealListLoader() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contracts')
    .select(
      `
      *,
      property:properties!property_id (*),
      seller:people!seller_id (*),
      purchaser:people!purchaser_id (*)
    `
    )
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
