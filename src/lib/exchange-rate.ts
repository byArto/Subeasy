const CACHE_KEY = 'neonsub-exchange-rate';

interface ExchangeRateCache {
  rate: number;
  fetchedAt: string;
  source: 'cbr';
}

async function fetchCBRRate(): Promise<number | null> {
  // Сначала через наш API route (обходит CORS)
  try {
    const res = await fetch('/api/rate');
    if (res.ok) {
      const data = await res.json();
      if (data.rate) return data.rate;
    }
  } catch { /* fallback ниже */ }

  // Fallback: напрямую к cbr-xml-daily
  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await res.json();
    return Math.round(data.Valute.USD.Value * 100) / 100;
  } catch {
    return null;
  }
}

function getCachedRate(): ExchangeRateCache | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedRate(rate: number): void {
  if (typeof window === 'undefined') return;
  const cache: ExchangeRateCache = {
    rate,
    fetchedAt: new Date().toISOString(),
    source: 'cbr',
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isRateStale(cache: ExchangeRateCache): boolean {
  const fetchedAt = new Date(cache.fetchedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 24;
}

/** Получить курс: из кеша или запросить свежий */
export async function getExchangeRate(fallbackRate: number = 96): Promise<number> {
  const cached = getCachedRate();

  if (cached && !isRateStale(cached)) {
    return cached.rate;
  }

  const freshRate = await fetchCBRRate();

  if (freshRate) {
    setCachedRate(freshRate);
    return freshRate;
  }

  return cached?.rate ?? fallbackRate;
}

/** Принудительно обновить курс */
export async function refreshExchangeRate(fallbackRate: number = 96): Promise<number> {
  const freshRate = await fetchCBRRate();
  if (freshRate) {
    setCachedRate(freshRate);
    return freshRate;
  }
  return getCachedRate()?.rate ?? fallbackRate;
}

/** Информация о кеше для UI */
export function getRateInfo(): { rate: number; updatedAt: string; isStale: boolean } | null {
  const cached = getCachedRate();
  if (!cached) return null;
  return {
    rate: cached.rate,
    updatedAt: cached.fetchedAt,
    isStale: isRateStale(cached),
  };
}
