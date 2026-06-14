import type { Currency } from './types';
import { CBR_CODES } from './currency';

const CACHE_KEY = 'neonsub-exchange-rate';

type RateMap = Partial<Record<Currency, number>>;

interface ExchangeRateCache {
  rates: RateMap;
  fetchedAt: string;
  source: 'cbr';
}

// Legacy shape (USD/EUR scalars) — migrated on read.
interface LegacyCache {
  rate?: number;
  eurRate?: number;
  fetchedAt?: string;
}

function computeFromCBR(valute: Record<string, { Value?: number; Nominal?: number }>): RateMap {
  const out: RateMap = {};
  for (const code of CBR_CODES) {
    const v = valute?.[code];
    if (v && typeof v.Value === 'number' && typeof v.Nominal === 'number' && v.Nominal > 0) {
      out[code as Currency] = Math.round((v.Value / v.Nominal) * 1e6) / 1e6;
    }
  }
  return out;
}

async function fetchCBRRates(): Promise<RateMap | null> {
  try {
    const res = await fetch('/api/rate');
    if (res.ok) {
      const data = await res.json();
      if (data.rates && Object.keys(data.rates).length > 0) return data.rates as RateMap;
    }
  } catch { /* fallback ниже */ }

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await res.json();
    return computeFromCBR(data.Valute);
  } catch {
    return null;
  }
}

function getCachedRate(): ExchangeRateCache | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as ExchangeRateCache & LegacyCache;
    // Migrate legacy {rate, eurRate} → {rates:{USD,EUR}}
    if (!parsed.rates && (typeof parsed.rate === 'number' || typeof parsed.eurRate === 'number')) {
      const rates: RateMap = {};
      if (typeof parsed.rate === 'number') rates.USD = parsed.rate;
      if (typeof parsed.eurRate === 'number') rates.EUR = parsed.eurRate;
      return { rates, fetchedAt: parsed.fetchedAt ?? new Date().toISOString(), source: 'cbr' };
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedRate(rates: RateMap): void {
  if (typeof window === 'undefined') return;
  const cache: ExchangeRateCache = { rates, fetchedAt: new Date().toISOString(), source: 'cbr' };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isRateStale(cache: ExchangeRateCache): boolean {
  const fetchedAt = new Date(cache.fetchedAt);
  const hoursDiff = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 24;
}

/** Получить карту курсов: из кеша или запросить свежую. */
export async function getExchangeRate(): Promise<RateMap> {
  const cached = getCachedRate();
  if (cached && !isRateStale(cached)) return cached.rates;

  const fresh = await fetchCBRRates();
  if (fresh) {
    setCachedRate(fresh);
    return fresh;
  }
  return cached?.rates ?? {};
}

/** Принудительно обновить карту курсов. */
export async function refreshExchangeRate(): Promise<RateMap> {
  const fresh = await fetchCBRRates();
  if (fresh) {
    setCachedRate(fresh);
    return fresh;
  }
  return getCachedRate()?.rates ?? {};
}

/** Информация о кеше для UI. */
export function getRateInfo(): { rates: RateMap; updatedAt: string; isStale: boolean } | null {
  const cached = getCachedRate();
  if (!cached) return null;
  return { rates: cached.rates, updatedAt: cached.fetchedAt, isStale: isRateStale(cached) };
}
