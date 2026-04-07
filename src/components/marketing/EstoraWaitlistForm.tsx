'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

const ROLE_OPTIONS = [
  { value: '', label: 'Select your role' },
  { value: 'Transaction Coordinator', label: 'Transaction Coordinator' },
  { value: 'Real Estate Attorney', label: 'Real Estate Attorney' },
  { value: 'Brokerage Operations / Admin', label: 'Brokerage Operations / Admin' },
  { value: 'Principal / Broker', label: 'Principal / Broker' },
  { value: 'Real Estate Agent', label: 'Real Estate Agent' },
  { value: 'Other', label: 'Other' },
] as const;

const DEAL_VOLUME_OPTIONS = [
  { value: '', label: 'Select range (optional)' },
  { value: '1-5', label: '1–5' },
  { value: '6-15', label: '6–15' },
  { value: '16-30', label: '16–30' },
  { value: '30+', label: '30+' },
] as const;

export default function EstoraWaitlistForm({
  mode,
  source = 'landing',
  className = '',
}: {
  mode: 'hero' | 'full';
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [activeDeals, setActiveDeals] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage(null);

    const signup_metadata =
      mode === 'full'
        ? {
            ...(role ? { role } : {}),
            ...(company.trim() ? { company: company.trim() } : {}),
            ...(activeDeals ? { active_deals: activeDeals } : {}),
            ...(painPoint.trim() ? { pain_point: painPoint.trim() } : {}),
          }
        : {};

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: mode === 'full' ? name.trim() : name.trim() || undefined,
          source,
          ...(mode === 'full' && Object.keys(signup_metadata).length > 0
            ? { signup_metadata }
            : {}),
        }),
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
      setRole('');
      setCompany('');
      setActiveDeals('');
      setPainPoint('');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    if (mode === 'full') {
      return (
        <div
          className={`rounded-lg border border-success/30 bg-green-50/90 px-5 py-6 text-[15px] leading-relaxed text-primary ${className}`}
          role="status"
        >
          <p className="font-display text-lg font-semibold text-navy">You&apos;re on the list.</p>
          <p className="mt-3 text-secondary">
            We review every submission personally and will be in touch when early access opens for your role.
          </p>
          <p className="mt-3 text-sm text-secondary">
            In the meantime — if you want to tell us more about how you work, reply to our confirmation email.
          </p>
        </div>
      );
    }
    return (
      <div
        className={`rounded-lg border border-success/30 bg-green-50/80 px-4 py-3 text-sm text-primary ${className}`}
        role="status"
      >
        {message}
      </div>
    );
  }

  if (mode === 'hero') {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col gap-3 ${className}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <label className="sr-only" htmlFor="estora-waitlist-hero-email">
            Work email
          </label>
          <input
            id="estora-waitlist-hero-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input min-h-[48px] flex-1"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="btn-gold min-h-[48px] inline-flex shrink-0 items-center justify-center gap-2 px-6 text-sm font-medium"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <>
                Join the waitlist
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
          No spam — early access updates only. We use your email only for Estora waitlist communication.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="estora-wl-name" className="field-label">
            Full name
          </label>
          <input
            id="estora-wl-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field-input min-h-[44px]"
            disabled={status === 'loading'}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="estora-wl-email" className="field-label">
            Work email
          </label>
          <input
            id="estora-wl-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input min-h-[44px]"
            disabled={status === 'loading'}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="estora-wl-role" className="field-label">
          Role
        </label>
        <select
          id="estora-wl-role"
          name="role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="field-select min-h-[44px]"
          disabled={status === 'loading'}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="estora-wl-company" className="field-label">
            Brokerage or company <span className="normal-case tracking-normal text-disabled">(optional)</span>
          </label>
          <input
            id="estora-wl-company"
            name="company"
            type="text"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="field-input min-h-[44px]"
            disabled={status === 'loading'}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="estora-wl-deals" className="field-label">
            Active transactions <span className="normal-case tracking-normal text-disabled">(optional)</span>
          </label>
          <select
            id="estora-wl-deals"
            name="active_deals"
            value={activeDeals}
            onChange={(e) => setActiveDeals(e.target.value)}
            className="field-select min-h-[44px]"
            disabled={status === 'loading'}
          >
            {DEAL_VOLUME_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="estora-wl-pain" className="field-label">
          Biggest operational pain point <span className="normal-case tracking-normal text-disabled">(optional)</span>
        </label>
        <textarea
          id="estora-wl-pain"
          name="pain_point"
          rows={3}
          maxLength={500}
          value={painPoint}
          onChange={(e) => setPainPoint(e.target.value)}
          className="field-input min-h-[88px] resize-y py-2"
          placeholder="Short answer is fine."
          disabled={status === 'loading'}
        />
      </div>
      {status === 'error' && message && (
        <p className="text-sm text-error" role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        className="btn-gold mt-1 inline-flex min-h-[48px] items-center justify-center gap-2 self-start px-8 text-sm font-medium"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <>
            Request early access
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </>
        )}
      </button>
      <p className="text-xs text-secondary">
        No product demos. No sales calls unless you want one. We&apos;ll reach out directly.
      </p>
    </form>
  );
}
