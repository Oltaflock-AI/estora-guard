/**
 * When WAITLIST_ONLY is enabled, the app exposes only the marketing landing page
 * and POST /api/waitlist. Dashboard, auth, and other API routes are blocked in middleware.
 */
export function isWaitlistOnly(): boolean {
  const v = process.env.WAITLIST_ONLY;
  return v === 'true' || v === '1';
}
