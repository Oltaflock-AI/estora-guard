import { Skeleton } from '@/components/ui/Skeleton';

export default function TransactionLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="flex items-center gap-6">
            <div>
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Three-column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline column */}
        <div className="lg:col-span-3">
          <div className="card">
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health + Summary column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card flex flex-col items-center py-6">
            <Skeleton className="h-4 w-16 mb-4 self-start" />
            <Skeleton className="h-16 w-16 rounded mb-3" />
            <Skeleton className="h-[120px] w-[6px] rounded-full" />
          </div>
          <div className="card">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks column */}
        <div className="lg:col-span-5">
          <div className="card">
            <Skeleton className="h-4 w-14 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
