'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const supabase = useRef(createClient()).current;

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/login` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="card text-center py-10">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
        <h2 className="font-display text-xl text-navy mb-2">
          Reset link sent
        </h2>
        <p className="text-secondary text-sm mb-6 max-w-xs mx-auto">
          If an account exists for{' '}
          <span className="font-mono text-primary">{email}</span>, you&apos;ll
          receive a password reset link shortly.
        </p>
        <Link href="/login" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="font-display text-xl text-navy mb-1">
          Reset your password
        </h2>
        <p className="text-secondary text-sm mb-6">
          Enter the email address associated with your account and we&apos;ll
          send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="field-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@brokerage.com"
              required
              autoComplete="email"
              autoFocus
              className="field-input w-full"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-error bg-red-50 rounded-md px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Reset Link
              </span>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-secondary mt-6">
        <Link
          href="/login"
          className="text-navy font-medium hover:text-navy-light transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>
      </p>
    </>
  );
}
