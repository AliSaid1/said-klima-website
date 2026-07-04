/**
 * Rate limiter with dual-mode operation:
 *
 * ► Production (Vercel / serverless):
 *   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your env vars.
 *   The limiter will use Upstash Redis — consistent across all function instances.
 *
 * ► Development / single-instance servers:
 *   When Upstash env vars are absent, falls back to an in-memory sliding-window
 *   store (state is per-process; adequate for local dev and traditional Node servers).
 *
 * Add to .env.local (get these from https://console.upstash.com):
 *   UPSTASH_REDIS_REST_URL=https://YOUR_URL.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=YOUR_TOKEN
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until the window resets
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.resetIn),
    'Retry-After':           String(result.resetIn),
  };
}

// ── Upstash path ──────────────────────────────────────────────────────────────

let _upstashLimiter: Record<string, import('@upstash/ratelimit').Ratelimit> | null = null;

function getUpstashLimiter(max: number, windowSecs: number): import('@upstash/ratelimit').Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;

  const key = `${max}:${windowSecs}`;
  if (!_upstashLimiter) _upstashLimiter = {};
  if (!_upstashLimiter[key]) {
    // Dynamic imports — only loaded when Upstash env vars exist
    const { Ratelimit }  = require('@upstash/ratelimit');
    const { Redis }      = require('@upstash/redis');
    _upstashLimiter[key] = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, `${windowSecs} s`),
      analytics: false,
    });
  }
  return _upstashLimiter[key];
}

async function upstashRateLimit(
  key: string,
  max: number,
  windowSecs: number,
): Promise<RateLimitResult | null> {
  try {
    const limiter = getUpstashLimiter(max, windowSecs);
    if (!limiter) return null;
    const { success, remaining, reset } = await limiter.limit(key);
    const resetIn = Math.ceil((reset - Date.now()) / 1000);
    return { allowed: success, remaining, resetIn: Math.max(0, resetIn) };
  } catch (e) {
    console.error('[RateLimit] Upstash error, falling back to in-memory:', e);
    return null; // fall through to in-memory
  }
}

// ── In-memory fallback ────────────────────────────────────────────────────────

interface WindowEntry { count: number; resetAt: number }
const store = new Map<string, WindowEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt <= now) store.delete(k);
  }
}, 60_000);

function memoryRateLimit(key: string, max: number, windowSecs: number): RateLimitResult {
  const now      = Date.now();
  const windowMs = windowSecs * 1000;
  const entry    = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetIn: windowSecs };
  }

  entry.count += 1;
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count), resetIn };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check (and increment) the rate limit for `key`.
 * Automatically uses Upstash when configured; falls back to in-memory.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSecs: number,
): Promise<RateLimitResult> {
  // Test/CI escape hatch: when DISABLE_RATE_LIMIT=1 is set, never limit. This
  // mirrors the same guard in middleware.ts and keeps direct callers (e.g. the
  // contact + upload routes) from tripping 429s when the E2E suite fires many
  // requests from one IP. Never set in production.
  if (process.env.DISABLE_RATE_LIMIT === '1') {
    return { allowed: true, remaining: max, resetIn: 0 };
  }

  const upstash = await upstashRateLimit(key, max, windowSecs);
  if (upstash) return upstash;
  return memoryRateLimit(key, max, windowSecs);
}
