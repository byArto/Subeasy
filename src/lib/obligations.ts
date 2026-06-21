import type { Subscription, ObligationKind } from './types';

export type AppMode = 'subscriptions' | 'credits' | 'mortgages';

export function getKind(o: Subscription): ObligationKind {
  return o.kind ?? 'subscription';
}

export function isLoan(o: Subscription): boolean {
  const k = getKind(o);
  return k === 'credit' || k === 'mortgage';
}

export function matchesMode(o: Subscription, mode: AppMode): boolean {
  if (mode === 'subscriptions') return getKind(o) === 'subscription';
  if (mode === 'credits') return getKind(o) === 'credit';
  return getKind(o) === 'mortgage';
}

/** Список видимых режимов по настройкам (subscriptions всегда первый). */
export function visibleModes(enabled?: { credits: boolean; mortgages: boolean }): AppMode[] {
  const modes: AppMode[] = ['subscriptions'];
  if (enabled?.credits) modes.push('credits');
  if (enabled?.mortgages) modes.push('mortgages');
  return modes;
}

export const MODE_KIND: Record<AppMode, ObligationKind> = {
  subscriptions: 'subscription',
  credits: 'credit',
  mortgages: 'mortgage',
};
