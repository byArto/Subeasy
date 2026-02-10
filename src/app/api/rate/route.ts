export async function GET() {
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', {
      next: { revalidate: 3600 }, // кешировать на 1 час на сервере
    });
    const data = await res.json();
    const rate = data.Valute.USD.Value;
    return Response.json({ rate: Math.round(rate * 100) / 100 });
  } catch {
    return Response.json({ rate: null }, { status: 500 });
  }
}
