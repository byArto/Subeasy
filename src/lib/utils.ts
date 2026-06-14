import type { Theme } from './themes';
import { Subscription, Currency, BillingCycle, CycleAnchor } from './types';
import { CURRENCY_SYMBOLS } from './constants';
import { DEFAULT_RATES } from './currency';

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
  rates: Record<Currency, number>, // RUB за 1 единицу каждой валюты (RUB = 1)
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? DEFAULT_RATES[from];
  const toRate = rates[to] ?? DEFAULT_RATES[to];
  const rubAmount = amount * fromRate;
  return Math.round((rubAmount / toRate) * 100) / 100;
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

function advanceOnce(d: Date, cycle: string, anchor: CycleAnchor) {
  if (anchor === 'days') {
    if (cycle === 'monthly') { d.setDate(d.getDate() + 30); return; }
    if (cycle === 'quarterly') { d.setDate(d.getDate() + 91); return; }
    if (cycle === 'yearly') { d.setDate(d.getDate() + 365); return; }
  }
  switch (cycle) {
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    case 'weekly':    d.setDate(d.getDate() + 7); break;
  }
}

export function getNextPaymentDate(
  current: string,
  cycle: string,
  anchor: CycleAnchor = 'date',
): string {
  const d = new Date(current);
  advanceOnce(d, cycle, anchor);

  // If the new date is still in the past, keep advancing one period at a time.
  const now = new Date();
  while (d.getTime() < now.getTime()) {
    const before = d.getTime();
    advanceOnce(d, cycle, anchor);
    if (d.getTime() === before) break; // unknown cycle — stop
  }
  return d.toISOString().split('T')[0];
}

/**
 * Given a subscription start date and billing cycle, returns the next future
 * payment date. Works for subscriptions added retroactively (e.g. started
 * 3 months ago) by advancing period-by-period until the date is in the future.
 */
export function calcNextPaymentFromStart(
  startDate: string,
  cycle: BillingCycle,
  anchor: CycleAnchor = 'date',
): string {
  if (cycle === 'one-time' || cycle === 'trial') return startDate;

  const d = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  do {
    const before = d.getTime();
    advanceOnce(d, cycle, anchor);
    if (d.getTime() === before) return startDate;
  } while (d <= today);

  return d.toISOString().split('T')[0];
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function isNearBlackNeutral(hex: string): boolean {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;

  const value = match[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return max <= 48 && max - min <= 10;
}

export function getThemeAccentColor(color: string, theme?: Theme): string {
  if (theme !== 'claude') return color;
  return isNearBlackNeutral(color) ? '#d97757' : color;
}

/**
 * Escape a string for safe interpolation into HTML — used for Telegram
 * `parse_mode: HTML` messages and PDF/HTML reports. Without this, a `<` or `&`
 * in a user-controlled subscription name breaks Telegram's HTML parser (the
 * message silently fails to send) and risks markup injection.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
