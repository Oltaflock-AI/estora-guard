import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendWaitlistConfirmationEmail } from '@/lib/email/send-waitlist-confirmation';
import { isWaitlistOnly } from '@/lib/waitlist';
import type { Json } from '@/lib/supabase/database.types';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Whitelist landing-page metadata keys for `signup_metadata` jsonb. */
function sanitizeSignupMetadata(raw: unknown): Json {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  const take = (key: string, max: number) => {
    const v = o[key];
    if (typeof v === 'string') {
      const t = v.trim().slice(0, max);
      if (t.length > 0) {
        out[key] = t;
      }
    }
  };
  take('role', 120);
  take('company', 200);
  take('active_deals', 32);
  take('pain_point', 500);
  return out;
}

export async function POST(request: NextRequest) {
  if (!isWaitlistOnly()) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('waitlist: SUPABASE_SERVICE_ROLE_KEY is not set');
    return NextResponse.json(
      { error: 'Could not save your signup. Please try again.' },
      { status: 500 }
    );
  }

  let body: { email?: unknown; name?: unknown; source?: unknown; signup_metadata?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }

  const name =
    typeof body.name === 'string' ? body.name.trim().slice(0, 200) || null : null;
  const source =
    typeof body.source === 'string' ? body.source.trim().slice(0, 64) : 'landing';
  const signup_metadata = sanitizeSignupMetadata(body.signup_metadata);

  const referrer = request.headers.get('referer')?.slice(0, 512) ?? null;

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from('waitlist_signups').insert({
    email,
    name,
    source,
    referrer,
    signup_metadata,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({
        ok: true,
        alreadyListed: true,
        message: "You're already on the list. We'll be in touch.",
        emailSent: false,
      });
    }
    console.error(
      'waitlist_signups insert:',
      error.message,
      'code:',
      error.code,
      'hint:',
      (error as { hint?: string }).hint
    );
    return NextResponse.json(
      { error: 'Could not save your signup. Please try again.' },
      { status: 500 }
    );
  }

  const emailResult = await sendWaitlistConfirmationEmail({ to: email, name });
  if (!emailResult.ok) {
    console.error('waitlist confirmation email:', emailResult.error);
  }

  return NextResponse.json({
    ok: true,
    alreadyListed: false,
    message: "You're on the list. We'll email you when access opens.",
    emailSent: emailResult.ok && !emailResult.skipped,
  });
}
