const CACHE_KEY = 'neonsub-exchange-rate';

interface ExchangeRateCache {
  rate: number;
  eurRate: number;
  fetchedAt: string;
  source: 'cbr';
}

async function fetchCBRRates(): Promise<{ rate: number; eurRate: number } | null> {
  try {
    const res = await fetch('/api/rate');
    if (res.ok) {
      const data = await res.json();
      if (data.rate && data.eurRate) return { rate: data.rate, eurRate: data.eurRate };
    }
  } catch { /* fallback ниже */ }

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await res.json();
    return {
      rate: Math.round(data.Valute.USD.Value * 100) / 100,
      eurRate: Math.round(data.Valute.EUR.Value * 100) / 100,
    };
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

function setCachedRate(rate: number, eurRate: number): void {
  if (typeof window === 'undefined') return;
  const cache: ExchangeRateCache = {
    rate,
    eurRate,
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
export async function getExchangeRate(fallbackRate: number = 96): Promise<{ rate: number; eurRate: number }> {
  const cached = getCachedRate();

  if (cached && !isRateStale(cached)) {
    return { rate: cached.rate, eurRate: cached.eurRate ?? 105 };
  }

  const fresh = await fetchCBRRates();

  if (fresh) {
    setCachedRate(fresh.rate, fresh.eurRate);
    return fresh;
  }

  return { rate: cached?.rate ?? fallbackRate, eurRate: cached?.eurRate ?? 105 };
}

/** Принудительно обновить курс */
export async function refreshExchangeRate(fallbackRate: number = 96): Promise<{ rate: number; eurRate: number }> {
  const fresh = await fetchCBRRates();
  if (fresh) {
    setCachedRate(fresh.rate, fresh.eurRate);
    return fresh;
  }
  const cached = getCachedRate();
  return { rate: cached?.rate ?? fallbackRate, eurRate: cached?.eurRate ?? 105 };
}

/** Информация о кеше для UI */
export function getRateInfo(): { rate: number; eurRate: number; updatedAt: string; isStale: boolean } | null {
  const cached = getCachedRate();
  if (!cached) return null;
  return {
    rate: cached.rate,
    eurRate: cached.eurRate ?? 105,
    updatedAt: cached.fetchedAt,
    isStale: isRateStale(cached),
  };
}
