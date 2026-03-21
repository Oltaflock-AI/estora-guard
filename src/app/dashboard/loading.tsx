import { DealTableSkeleton } from '@/components/ui/Skeleton';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Upload area skeleton */}
      <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center">
        <Skeleton className="w-12 h-12 rounded-full mb-3" />
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-36" />
      </div>

      {/* Deal table skeleton */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <DealTableSkeleton rows={5} />
      </div>
    </div>
  );
}
