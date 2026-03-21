'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-error" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-display text-xl text-navy mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-secondary leading-relaxed">
            We encountered an unexpected error loading this page. This has been
            logged automatically.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-disabled mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={reset} className="btn-primary gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link href="/dashboard" className="btn-secondary gap-2">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
