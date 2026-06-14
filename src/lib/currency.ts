import type { Currency, AppSettings } from './types';

export interface CurrencyMeta {
  code: Currency;
  symbol: string;
  cbr: string | null; // CBR CharCode; null = база (RUB)
  nameKey: string;    // ключ i18n
}

// Порядок = порядок отображения в пикере.
export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'RUB', symbol: '₽',   cbr: null,  nameKey: 'currency.name.RUB' },
  { code: 'USD', symbol: '$',   cbr: 'USD', nameKey: 'currency.name.USD' },
  { code: 'EUR', symbol: '€',   cbr: 'EUR', nameKey: 'currency.name.EUR' },
  { code: 'BYN', symbol: 'Br',  cbr: 'BYN', nameKey: 'currency.name.BYN' },
  { code: 'KZT', symbol: '₸',   cbr: 'KZT', nameKey: 'currency.name.KZT' },
  { code: 'UAH', symbol: '₴',   cbr: 'UAH', nameKey: 'currency.name.UAH' },
  { code: 'AMD', symbol: '֏',   cbr: 'AMD', nameKey: 'currency.name.AMD' },
  { code: 'KGS', symbol: 'сом', cbr: 'KGS', nameKey: 'currency.name.KGS' },
  { code: 'UZS', symbol: 'сўм', cbr: 'UZS', nameKey: 'currency.name.UZS' },
  { code: 'GEL', symbol: '₾',   cbr: 'GEL', nameKey: 'currency.name.GEL' },
];

export const ALL_CURRENCIES: Currency[] = SUPPORTED_CURRENCIES.map((c) => c.code);

// Список CBR CharCode для запроса в /api/rate.
export const CBR_CODES: string[] = SUPPORTED_CURRENCIES
  .map((c) => c.cbr)
  .filter((c): c is string => c !== null);

// RUB за 1 единицу — фоллбэк до первого ответа ЦБ / при сбое. Обновляется live.
export const DEFAULT_RATES: Record<Currency, number> = {
  RUB: 1, USD: 96, EUR: 105, BYN: 30, KZT: 0.19,
  UAH: 2.4, AMD: 0.25, KGS: 1.1, UZS: 0.0078, GEL: 35,
};

/** Полная карта RUB-за-единицу для конвертации: settings.rates поверх дефолтов; RUB=1. */
export function resolveRates(settings: Pick<AppSettings, 'rates'>): Record<Currency, number> {
  const out: Record<Currency, number> = { ...DEFAULT_RATES };
  const r = settings.rates;
  if (r) {
    for (const k of ALL_CURRENCIES) {
      const v = r[k];
      if (typeof v === 'number' && v > 0) out[k] = v;
    }
  }
  out.RUB = 1;
  return out;
}

/** Эффективная карта = ручные оверрайды (если включены) поверх авто-курсов. */
export function computeEffectiveRates(
  autoRates: Partial<Record<Currency, number>>,
  manualRates: Partial<Record<Currency, number>> | undefined,
  useManual: boolean,
): Record<Currency, number> {
  const out: Record<Currency, number> = { ...DEFAULT_RATES };
  for (const k of ALL_CURRENCIES) {
    const v = autoRates[k];
    if (typeof v === 'number' && v > 0) out[k] = v;
  }
  if (useManual && manualRates) {
    for (const k of ALL_CURRENCIES) {
      const v = manualRates[k];
      if (typeof v === 'number' && v > 0) out[k] = v;
    }
  }
  out.RUB = 1;
  return out;
}
