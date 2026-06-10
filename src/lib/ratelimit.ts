import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazily initialized — only created when env vars are present
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// Pre-configured limiters keyed by route group
const limiters: Record<string, Ratelimit> = {};

function getLimiter(key: string, requests: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  if (!limiters[key]) {
    limiters[key] = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      prefix: `rl:${key}`,
    });
  }
  return limiters[key];
}

/**
 * Check rate limit. Returns true if request is allowed, false if it should be blocked.
 *
 * Default behaviour is fail-OPEN (returns true when Upstash is missing or errors) so
 * a Redis hiccup can never take down core flows (sync, account actions, the bot).
 *
 * Pass `{ failClosed: true }` for endpoints where an unbounded fallback is a real risk
 * (e.g. the global OCR cost circuit-breaker — without Redis it would otherwise allow
 * unlimited paid OpenAI calls). Fail-closed only blocks in production / on real errors;
 * a missing Redis in local dev still fails open so development isn't disrupted.
 */
export async function checkRateLimit(
  routeKey: string,
  identifier: string,
  requests: number,
  windowSeconds: number,
  opts?: { failClosed?: boolean },
): Promise<boolean> {
  const failClosed = opts?.failClosed === true;
  try {
    const limiter = getLimiter(routeKey, requests, windowSeconds);
    if (!limiter) {
      // Redis is ENTIRELY ABSENT. This is a deliberate deployment state (local dev,
      // or prod without Upstash) — always fail OPEN so we never hard-disable a
      // feature just because rate limiting isn't wired up. `failClosed` does NOT
      // apply here; it guards the *outage* of a configured Redis (catch branch).
      if (process.env.NODE_ENV === 'production') {
        console.error(`[ratelimit] Redis not configured in production — '${routeKey}' is UNLIMITED`);
      }
      return true;
    }

    const { success } = await limiter.limit(identifier);
    return success;
  } catch (err) {
    // Redis IS configured but errored (transient outage). Core routes fail open so
    // a hiccup can't take them down; cost-sensitive routes (failClosed) block here
    // to avoid e.g. unbounded paid OpenAI calls while Redis is unreachable.
    console.error(`[ratelimit] check failed for '${routeKey}', failing ${failClosed ? 'closed' : 'open'}:`, err);
    return !failClosed;
  }
}
