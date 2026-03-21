'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import PasswordStrength from '@/components/security/PasswordStrength';

const MIN_PASSWORD_LENGTH = 14;

export default function SignupPage() {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (fullName.trim().length < 2) {
      return 'Please enter your full name.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="card text-center py-10">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
        <h2 className="font-display text-xl text-navy mb-2">
          Check your email
        </h2>
        <p className="text-secondary text-sm mb-6 max-w-xs mx-auto">
          We sent a confirmation link to{' '}
          <span className="font-mono text-primary">{email}</span>. Click it to
          activate your account.
        </p>
        <Link href="/login" className="btn-secondary">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="field-label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
              autoComplete="name"
              autoFocus
              className="field-input w-full"
            />
          </div>

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
              className="field-input w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 14 characters"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className="field-input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-disabled hover:text-secondary transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <PasswordStrength password={password} minLength={MIN_PASSWORD_LENGTH} />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="field-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
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
                Creating account…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Create Account
              </span>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-secondary mt-6">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-navy font-medium hover:text-navy-light transition-colors"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
