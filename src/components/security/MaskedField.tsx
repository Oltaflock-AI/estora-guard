'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface MaskedFieldProps {
  value: string | null;
  label?: string;
  entityType?: string;
  entityId?: string;
  fieldName?: string;
  holdDuration?: number;
  className?: string;
}

function maskValue(raw: string | null): string {
  if (!raw) return '•••-••-••••';
  const cleaned = raw.replace(/[^0-9X*•x]/g, '');
  if (cleaned.length >= 4) {
    return `•••-••-${cleaned.slice(-4)}`;
  }
  return raw.replace(/./g, '•');
}

export default function MaskedField({
  value,
  label,
  entityType,
  entityId,
  fieldName = 'masked_tax_id',
  holdDuration = 300,
  className = '',
}: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const logReveal = useCallback(async () => {
    try {
      await fetch('/api/security/pii-reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, fieldName }),
      });
    } catch {
      // non-blocking
    }
  }, [entityType, entityId, fieldName]);

  const handleHoldStart = useCallback(() => {
    if (revealed) return;
    setHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min(1, elapsed / holdDuration));
    }, 16);

    holdTimerRef.current = setTimeout(() => {
      clearTimers();
      setRevealed(true);
      setHolding(false);
      setProgress(1);
      logReveal();

      setTimeout(() => {
        setRevealed(false);
        setProgress(0);
      }, 5000);
    }, holdDuration);
  }, [revealed, holdDuration, clearTimers, logReveal]);

  const handleHoldEnd = useCallback(() => {
    if (!revealed) {
      clearTimers();
      setHolding(false);
      setProgress(0);
    }
  }, [revealed, clearTimers]);

  const displayValue = revealed ? value : maskValue(value);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs text-secondary">{label}</span>
      )}

      <span className="font-mono text-sm tabular-nums text-primary select-none">
        {displayValue || '—'}
      </span>

      {value && (
        <button
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          className="relative p-1 rounded text-secondary hover:text-primary transition-colors"
          title={revealed ? 'Value revealed (auto-hides)' : `Hold ${holdDuration}ms to reveal`}
          aria-label={revealed ? 'PII revealed' : 'Hold to reveal PII'}
        >
          {holding && !revealed && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="var(--color-gold)"
                strokeWidth="2"
                strokeDasharray={`${progress * 62.83} 62.83`}
                strokeLinecap="round"
                transform="rotate(-90 12 12)"
                className="transition-none"
              />
            </svg>
          )}
          {revealed ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      <ShieldAlert className="w-3 h-3 text-disabled" strokeWidth={1.5} />
    </div>
  );
}
