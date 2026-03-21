import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-border" strokeWidth={1} />
        </div>
        <div>
          <h1 className="font-display text-2xl text-navy mb-2">
            Page not found
          </h1>
          <p className="text-sm text-secondary">
            The page you are looking for does not exist or has been moved.
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
