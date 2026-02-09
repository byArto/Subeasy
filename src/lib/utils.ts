import { Subscription, Currency } from './types';
import { CURRENCY_SYMBOLS } from './constants';

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${amount.toLocaleString('ru-RU')} ${symbol}`;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRate: number
): number {
  if (from === to) return amount;

  // exchangeRate = сколько RUB за 1 USD
  const toUsd: Record<Currency, (n: number) => number> = {
    USD: (n) => n,
    RUB: (n) => n / exchangeRate,
    EUR: (n) => n / (exchangeRate * 0.92), // примерный курс EUR/USD
  };

  const fromUsd: Record<Currency, (n: number) => number> = {
    USD: (n) => n,
    RUB: (n) => n * exchangeRate,
    EUR: (n) => n * exchangeRate * 0.92,
  };

  const usdAmount = toUsd[from](amount);
  return Math.round(fromUsd[to](usdAmount) * 100) / 100;
}

export function getMonthlyPrice(sub: Subscription): number {
  switch (sub.cycle) {
    case 'weekly':
      return sub.price * 4.33;
    case 'monthly':
      return sub.price;
    case 'yearly':
      return sub.price / 12;
    case 'one-time':
      return 0;
    default:
      return sub.price;
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

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
