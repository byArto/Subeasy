import { Subscription, Currency } from './types';
import { CURRENCY_SYMBOLS } from './constants';

export function generateId(): string {
  return crypto.randomUUID();
}

/** Whitelist only http/https URLs — blocks javascript:, data:, etc. */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
  } catch { /* invalid URL */ }
  return '';
}

export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRate: number,  // USD/RUB
  eurRate: number = 105  // EUR/RUB
): number {
  if (from === to) return amount;

  // Convert to RUB first, then to target
  const toRub: Record<Currency, (n: number) => number> = {
    RUB: (n) => n,
    USD: (n) => n * exchangeRate,
    EUR: (n) => n * eurRate,
  };

  const fromRub: Record<Currency, (n: number) => number> = {
    RUB: (n) => n,
    USD: (n) => n / exchangeRate,
    EUR: (n) => n / eurRate,
  };

  const rubAmount = toRub[from](amount);
  return Math.round(fromRub[to](rubAmount) * 100) / 100;
}

export function getMonthlyPrice(sub: Subscription): number {
  switch (sub.cycle) {
    case 'quarterly':
      return sub.price / 3;
    case 'monthly':
      return sub.price;
    case 'yearly':
      return sub.price / 12;
    case 'one-time':
    case 'trial':
      return 0;
    default:
      return 0;
  }
}

export function getDaysUntilPayment(nextPaymentDate: string): number {
  const now = new Date();
  const payment = new Date(nextPaymentDate);
  const diff = payment.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isPaymentSoon(nextPaymentDate: string, daysBefore: number): boolean {
  const days = getDaysUntilPayment(nextPaymentDate);
  return days >= 0 && days <= daysBefore;
}

export function getNextPaymentDate(current: string, cycle: string): string {
  const d = new Date(current);
  switch (cycle) {
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  // If the new date is still in the past, keep advancing
  const now = new Date();
  while (d.getTime() < now.getTime()) {
    switch (cycle) {
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'yearly':
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        return d.toISOString().split('T')[0];
    }
  }
  return d.toISOString().split('T')[0];
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
