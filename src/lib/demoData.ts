import { Subscription } from './types';

/**
 * Demo / sample data shown on first launch via "Try with sample data".
 *
 * IDs are prefixed `demo-` so they are:
 *  - excluded from cloud sync (see `lib/sync.ts`), and
 *  - wiped in one tap (the demo banner) or automatically when the user adds
 *    their first real subscription.
 */
export const DEMO_ID_PREFIX = 'demo-';

export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_ID_PREFIX);
}

export function hasDemoData(subs: Subscription[]): boolean {
  return subs.some((s) => isDemoId(s.id));
}

/** ISO `yyyy-mm-dd` for today + `offsetDays` (midnight-aligned). */
function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

/**
 * Realistic sample subscriptions. Payment dates are computed relative to today
 * so the dashboard, upcoming list, calendar and notifications all look alive
 * (one due in 2 days, a mix of monthly/yearly and RUB/USD).
 */
export function getDemoSubscriptions(): Subscription[] {
  const now = new Date().toISOString();
  const base = {
    notes: '',
    managementUrl: '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const subs: Subscription[] = [
    { ...base, id: 'demo-1', name: 'Netflix', price: 599, currency: 'RUB', category: '1', cycle: 'monthly', nextPaymentDate: isoDay(2), startDate: isoDay(-88), paymentMethod: 'card:physical:Tinkoff Black', color: '#E50914', icon: '📺' },
    { ...base, id: 'demo-2', name: 'Spotify', price: 169, currency: 'RUB', category: '2', cycle: 'monthly', nextPaymentDate: isoDay(11), startDate: isoDay(-49), paymentMethod: 'card:virtual:Alfa', color: '#1DB954', icon: '🎵' },
    { ...base, id: 'demo-3', name: 'ChatGPT Plus', price: 20, currency: 'USD', category: '7', cycle: 'monthly', nextPaymentDate: isoDay(5), startDate: isoDay(-25), paymentMethod: 'card:virtual:Visa', color: '#10A37F', icon: '🤖' },
    { ...base, id: 'demo-4', name: 'YouTube Premium', price: 399, currency: 'RUB', category: '1', cycle: 'monthly', nextPaymentDate: isoDay(19), startDate: isoDay(-200), paymentMethod: 'sbp:Сбербанк', color: '#FF0000', icon: '▶️' },
    { ...base, id: 'demo-5', name: 'iCloud+', price: 149, currency: 'RUB', category: '4', cycle: 'monthly', nextPaymentDate: isoDay(8), startDate: isoDay(-365), paymentMethod: 'card:physical:Tinkoff Black', color: '#3395FF', icon: '☁️' },
    { ...base, id: 'demo-6', name: 'PlayStation Plus', price: 6699, currency: 'RUB', category: '5', cycle: 'yearly', nextPaymentDate: isoDay(43), startDate: isoDay(-322), paymentMethod: 'card:physical:МИР', color: '#0070D1', icon: '🎮' },
  ];

  return subs;
}
