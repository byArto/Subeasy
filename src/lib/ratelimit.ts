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
 * Fails OPEN (returns true) if Upstash is not configured — safe for local dev.
 */
export async function checkRateLimit(
  routeKey: string,
  identifier: string,
  requests: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const limiter = getLimiter(routeKey, requests, windowSeconds);
    if (!limiter) return true; // No Redis configured — allow all (local dev)

    const { success } = await limiter.limit(identifier);
    return success;
  } catch {
    return true; // Fail open — never break the app due to rate limit errors
  }
}
