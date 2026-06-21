import type { Subscription, ObligationKind } from './types';
import type { LoanInput } from './loanUtils';

export type AppMode = 'all' | 'subscriptions' | 'credits' | 'mortgages';

/**
 * Превращает обязательство в вход для расчёта амортизации.
 * Срок берём из termMonths, иначе оцениваем по остатку/платежу (макс. 360 мес).
 * Возвращает null, если данных недостаточно для построения графика.
 */
export function obligationToLoanInput(o: Subscription): LoanInput | null {
  const bal = o.outstandingBalance;
  if (!bal || bal <= 0) return null;
  const term = o.termMonths && o.termMonths > 0
    ? o.termMonths
    : o.price > 0 ? Math.min(Math.ceil(bal / o.price), 360) : 0;
  if (term <= 0) return null;
  return {
    balance: bal,
    annualRatePct: o.interestRate ?? 0,
    termMonths: term,
    scheme: o.paymentScheme ?? 'annuity',
    startDate: o.nextPaymentDate,
    monthlyPayment: o.price > 0 ? o.price : undefined,
  };
}

export function getKind(o: Subscription): ObligationKind {
  return o.kind ?? 'subscription';
}

export function isLoan(o: Subscription): boolean {
  const k = getKind(o);
  return k === 'credit' || k === 'mortgage';
}

export function matchesMode(o: Subscription, mode: AppMode): boolean {
  if (mode === 'all') return true;
  if (mode === 'subscriptions') return getKind(o) === 'subscription';
  if (mode === 'credits') return getKind(o) === 'credit';
  return getKind(o) === 'mortgage';
}

/**
 * Список видимых режимов по настройкам. «Все» появляется первым только когда
 * включён хотя бы один доп. раздел (иначе показывать «Все» рядом с «Подписки» незачем).
 */
export function visibleModes(enabled?: { credits: boolean; mortgages: boolean }): AppMode[] {
  const hasExtra = !!(enabled?.credits || enabled?.mortgages);
  const modes: AppMode[] = hasExtra ? ['all', 'subscriptions'] : ['subscriptions'];
  if (enabled?.credits) modes.push('credits');
  if (enabled?.mortgages) modes.push('mortgages');
  return modes;
}

export const MODE_KIND: Record<AppMode, ObligationKind> = {
  all: 'subscription',
  subscriptions: 'subscription',
  credits: 'credit',
  mortgages: 'mortgage',
};
