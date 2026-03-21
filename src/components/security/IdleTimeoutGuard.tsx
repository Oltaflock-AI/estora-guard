'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Clock, LogOut } from 'lucide-react';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;
const WARNING_THRESHOLD_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_MS;

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

export default function IdleTimeoutGuard() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsLeft(120);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [showWarning]);

  const handleLogout = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    await supabaseRef.current.auth.signOut();
    router.push('/login?reason=idle');
    router.refresh();
  }, [router]);

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetActivity, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetActivity);
      }
    };
  }, [resetActivity]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        handleLogout();
        return;
      }

      if (elapsed >= WARNING_THRESHOLD_MS && !showWarning) {
        setShowWarning(true);
        const remaining = Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000);
        setSecondsLeft(remaining);

        countdownRef.current = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              handleLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning, handleLogout]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-raised rounded-lg shadow-lg border border-border max-w-sm w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-display text-lg text-navy">Session Expiring</h3>
            <p className="text-xs text-secondary">
              You&apos;ve been inactive for a while
            </p>
          </div>
        </div>

        <p className="text-sm text-secondary mb-4">
          Your session will expire in{' '}
          <span className="font-mono font-medium text-warning tabular-nums">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          . Move your mouse or press any key to stay signed in.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={resetActivity}
            className="btn-primary flex-1"
          >
            Stay Signed In
          </button>
          <button
            onClick={handleLogout}
            className="btn-secondary flex-shrink-0 gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
