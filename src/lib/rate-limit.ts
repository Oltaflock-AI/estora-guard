const rateStore = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of Array.from(rateStore.entries())) {
    if (entry.resetAt < now) {
      rateStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { maxRequests: 10, windowMs: 15 * 60 * 1000 } as RateLimitConfig,
  general: { maxRequests: 300, windowMs: 60 * 1000 } as RateLimitConfig,
  export: { maxRequests: 10, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  piiReveal: { maxRequests: 20, windowMs: 60 * 60 * 1000 } as RateLimitConfig,
  upload: { maxRequests: 20, windowMs: 60 * 1000 } as RateLimitConfig,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function rateLimitKey(identifier: string, bucket: string): string {
  return `${bucket}:${identifier}`;
}
