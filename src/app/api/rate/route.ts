import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { CBR_CODES } from '@/lib/currency';

// NOTE: intentionally NOT edge runtime. The rate limiter reads UPSTASH_* env vars,
// which are marked "Sensitive" in Vercel and therefore NOT exposed to the Edge
// runtime — on edge the limiter silently fails open. nodejs (default) reads them
// fine, so the rate limit actually applies here.
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  if (!await checkRateLimit('rate-api', ip, 120, 60)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
      cache: 'no-store',
    });
    const data = await res.json();
    const valute = data?.Valute ?? {};

    // RUB за 1 единицу каждой валюты = Value / Nominal (Nominal у KZT/UAH/… ≠ 1).
    const rates: Record<string, number> = {};
    for (const code of CBR_CODES) {
      const v = valute[code];
      if (v && typeof v.Value === 'number' && typeof v.Nominal === 'number' && v.Nominal > 0) {
        rates[code] = Math.round((v.Value / v.Nominal) * 1e6) / 1e6;
      }
    }

    return new Response(
      // rate/eurRate — для совместимости со старыми закешированными клиентами
      JSON.stringify({ rates, rate: rates.USD ?? null, eurRate: rates.EUR ?? null }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      },
    );
  } catch {
    return new Response(JSON.stringify({ rates: null, rate: null, eurRate: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
