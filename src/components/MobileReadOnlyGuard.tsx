'use client';

import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function MobileReadOnlyGuard({ children }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile && !dismissed) {
    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-surface p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <Monitor className="w-7 h-7 text-gold" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-display text-lg text-navy mb-2">
              Best on desktop
            </h2>
            <p className="text-sm text-secondary leading-relaxed">
              The Agreement Workspace is optimized for larger screens. Open this
              page on a desktop or tablet for the full editing experience.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="btn-secondary !text-xs"
          >
            View in read-only mode
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
