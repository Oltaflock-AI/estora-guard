'use client';

import { AlertTriangle } from 'lucide-react';

interface ClosingProximityFlagProps {
  closingDate: string | null;
  className?: string;
}

export default function ClosingProximityFlag({
  closingDate,
  className = '',
}: ClosingProximityFlagProps) {
  if (!closingDate) return null;

  const closing = new Date(closingDate);
  const now = new Date();
  const hoursUntilClosing =
    (closing.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilClosing > 72 || hoursUntilClosing < 0) return null;

  return (
    <div
      className={`flex items-center gap-2 bg-warning/10 border border-warning/30 rounded px-3 py-2 ${className}`}
      role="alert"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
      <p className="text-[11px] text-warning font-medium leading-tight">
        Closing within 72 hours — all changes to escrow, banking, or financial
        fields require elevated review.
      </p>
    </div>
  );
}
