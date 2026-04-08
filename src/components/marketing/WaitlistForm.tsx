'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function WaitlistForm({
  className = '',
  source = 'landing',
}: {
  className?: string;
  source?: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'success') return;
    const id = window.setTimeout(() => {
      setStatus('idle');
      setMessage(null);
    }, 7000);
    return () => window.clearTimeout(id);
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name.trim() || undefined, source }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong.');
        return;
      }

      setStatus('success');
      setMessage(data.message ?? "You're on the list.");
      setEmail('');
      setName('');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  if (status === 'success' && message) {
    return (
      <div
        className={`rounded-lg border border-success/30 bg-green-50/80 px-4 py-3 text-sm text-primary ${className}`}
        role="status"
      >
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="waitlist-email">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field-input min-h-[44px] flex-1"
          disabled={status === 'loading'}
        />
        <label className="sr-only" htmlFor="waitlist-name">
          Name (optional)
        </label>
        <input
          id="waitlist-name"
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-input min-h-[44px] flex-1 sm:max-w-[200px]"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          className="btn-gold inline-flex min-h-[44px] items-center justify-center gap-2 shrink-0"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              Join waitlist
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </>
          )}
        </button>
      </div>
      {status === 'error' && message && (
        <p className="text-sm text-error" role="alert">
          {message}
        </p>
      )}
      <p className="text-xs text-secondary">
        No spam—just early access updates. We use your email only for Estora waitlist communication.
      </p>
    </form>
  );
}
