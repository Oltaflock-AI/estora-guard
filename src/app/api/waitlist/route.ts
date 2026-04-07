import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isWaitlistOnly } from '@/lib/waitlist';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  if (!isWaitlistOnly()) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  let body: { email?: unknown; name?: unknown; source?: unknown };
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

  const referrer = request.headers.get('referer')?.slice(0, 512) ?? null;

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from('waitlist_signups').insert({
    email,
    name,
    source,
    referrer,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({
        ok: true,
        alreadyListed: true,
        message: "You're already on the list. We'll be in touch.",
      });
    }
    console.error('waitlist_signups insert:', error.message);
    return NextResponse.json(
      { error: 'Could not save your signup. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyListed: false,
    message: "You're on the list. We'll email you when access opens.",
  });
}
