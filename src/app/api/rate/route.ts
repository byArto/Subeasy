export const runtime = 'edge';

export async function GET() {
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
      cache: 'no-store',
    });
    const data = await res.json();
    const rate = data.Valute.USD.Value;
    return new Response(JSON.stringify({ rate: Math.round(rate * 100) / 100 }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch {
    return new Response(JSON.stringify({ rate: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
