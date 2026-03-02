import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

export const runtime = 'edge';

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
    const usd = Math.round(data.Valute.USD.Value * 100) / 100;
    const eur = Math.round(data.Valute.EUR.Value * 100) / 100;
    return new Response(JSON.stringify({ rate: usd, eurRate: eur }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch {
    return new Response(JSON.stringify({ rate: null, eurRate: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
