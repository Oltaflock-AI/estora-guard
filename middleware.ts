import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit';
import { isWaitlistOnly } from '@/lib/waitlist';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `img-src 'self' data: blob: https://*.supabase.co`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  return response;
}

function rateLimitBucket(pathname: string): string {
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) return 'login';
  if (pathname === '/api/waitlist') return 'waitlist';
  if (pathname.includes('/pii-reveal')) return 'piiReveal';
  if (pathname.includes('/upload')) return 'upload';
  if (pathname.includes('/export')) return 'export';
  return 'general';
}

function allowWaitlistPublicPath(pathname: string, method: string): boolean {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico') return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname)) return true;
  if (pathname === '/') return true;
  if (pathname === '/api/waitlist' && (method === 'POST' || method === 'OPTIONS')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const waitlistOnly = isWaitlistOnly();

  if (waitlistOnly && !allowWaitlistPublicPath(pathname, method)) {
    if (pathname.startsWith('/api/')) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Not available during waitlist.' }, { status: 404 })
      );
    }
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return addSecurityHeaders(NextResponse.redirect(home));
  }

  if (
    waitlistOnly &&
    (pathname === '/' ||
      pathname.startsWith('/_next/') ||
      pathname === '/favicon.ico' ||
      /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname))
  ) {
    return addSecurityHeaders(NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password';
  const isDashboard = pathname.startsWith('/dashboard');
  const isApiRoute = pathname.startsWith('/api/');
  const isCronRoute = pathname.startsWith('/api/cron/');

  if (isApiRoute || isAuthPage) {
    const ip = getClientIp(request);
    const bucket = rateLimitBucket(pathname);
    const config = RATE_LIMITS[bucket as keyof typeof RATE_LIMITS] ?? RATE_LIMITS.general;
    const identifier = user?.id ?? ip;
    const result = checkRateLimit(rateLimitKey(identifier, bucket), config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(retryAfter));
      response.headers.set('X-RateLimit-Remaining', '0');
      return addSecurityHeaders(response);
    }

    supabaseResponse.headers.set(
      'X-RateLimit-Remaining',
      String(result.remaining)
    );
  }

  if (isApiRoute && isCronRoute) {
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }
    return addSecurityHeaders(supabaseResponse);
  }

  if (isApiRoute && !user) {
    const waitlistApiBypass =
      waitlistOnly && pathname === '/api/waitlist' && (method === 'POST' || method === 'OPTIONS');
    if (!waitlistApiBypass) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      );
    }
  }

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return addSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
