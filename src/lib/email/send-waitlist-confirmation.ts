import { Resend } from 'resend';

function firstNameFromFull(name: string | null): string | null {
  if (!name) return null;
  const part = name.trim().split(/\s+/)[0];
  return part.length > 0 ? part : null;
}

/**
 * Sends a short waitlist confirmation via Resend.
 * Requires RESEND_API_KEY and RESEND_FROM (e.g. `Estora <hello@yourdomain.com>`).
 * Optional RESEND_REPLY_TO so replies go to your inbox when `from` is a no-reply address.
 */
export async function sendWaitlistConfirmationEmail(params: {
  to: string;
  name: string | null;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey) {
    return { ok: true, skipped: true };
  }
  if (!from) {
    console.warn('waitlist email: set RESEND_FROM (e.g. Estora <noreply@yourdomain.com>) to send confirmations');
    return { ok: true, skipped: true };
  }

  const first = firstNameFromFull(params.name);
  const greeting = first ? `Hi ${first},` : 'Hi there,';

  const text = [
    greeting,
    '',
    "You're all set — we've saved your spot on the Estora waitlist.",
    '',
    "If you'd like to share more about your business or how your team runs transactions, just reply to this email. We read every message.",
    '',
    '— Estora',
  ].join('\n');

  const html = `
<p>${greeting}</p>
<p>You're all set — we've saved your spot on the Estora waitlist.</p>
<p>If you'd like to share more about your business or how your team runs transactions, just reply to this email. We read every message.</p>
<p>— Estora</p>
`.trim();

  const replyTo = process.env.RESEND_REPLY_TO?.trim();
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: "You're on the Estora waitlist",
    text,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
