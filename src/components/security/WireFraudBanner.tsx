'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface WireFraudBannerProps {
  variant?: 'inline' | 'page';
  className?: string;
}

export default function WireFraudBanner({
  variant = 'inline',
  className = '',
}: WireFraudBannerProps) {
  if (variant === 'page') {
    return (
      <div
        className={`bg-error/5 border border-error/20 rounded-lg px-4 py-3 ${className}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-medium text-error">
              Wire Fraud Warning
            </p>
            <p className="text-xs text-error/80 mt-1 leading-relaxed">
              Never send wire transfer instructions via email. Always verify
              wiring instructions by calling your attorney or title company
              directly using a known phone number. Estora will never ask for
              banking credentials or initiate wire transfers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 bg-error/5 border border-error/20 rounded px-3 py-2 ${className}`}
      role="alert"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-error flex-shrink-0" />
      <p className="text-[11px] text-error/80 leading-tight">
        Verify all wiring instructions by phone. Never send funds based solely
        on email instructions.
      </p>
    </div>
  );
}
