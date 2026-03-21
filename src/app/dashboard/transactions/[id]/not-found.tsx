import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function TransactionNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center">
          <FileQuestion className="w-7 h-7 text-border" strokeWidth={1} />
        </div>
        <div>
          <h2 className="font-display text-xl text-navy mb-2">
            Transaction not found
          </h2>
          <p className="text-sm text-secondary">
            This transaction may have been removed or you may not have access.
          </p>
        </div>
        <Link href="/dashboard" className="btn-primary gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
