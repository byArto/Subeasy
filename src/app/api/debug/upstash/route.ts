import { NextResponse } from 'next/server';

// TEMPORARY diagnostic — reports whether the production runtime can see/use the
// Upstash env vars. Returns NO secret values (only presence, lengths, host, ping).
// Remove after debugging.
export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const out: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    hasUrl: !!url,
    urlLen: url?.length ?? 0,
    urlHasWhitespace: url ? url !== url.trim() : null,
    urlHost: (() => { try { return url ? new URL(url.trim()).host : null; } catch { return 'INVALID_URL'; } })(),
    hasToken: !!token,
    tokenLen: token?.length ?? 0,
    tokenHasWhitespace: token ? token !== token.trim() : null,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasVapidPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  };

  try {
    if (url && token) {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url: url.trim(), token: token.trim() });
      out.ping = await redis.ping();
    } else {
      out.ping = 'env-missing';
    }
  } catch (e) {
    out.ping = 'ERROR';
    out.pingError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(out);
}
