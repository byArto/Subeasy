/**
 * Shared formatting helpers for CSV / PDF / HTML reports.
 * Previously duplicated verbatim in export.ts and reportHtml.ts.
 */
import type { Subscription, Category } from './types';

export function getCategoryName(sub: Subscription, categories: Category[]): string {
  return categories.find((c) => c.id === sub.category)?.name ?? sub.category;
}

export function formatCycleLabel(cycle: string, isRu: boolean): string {
  const labels: Record<string, [string, string]> = {
    monthly:    ['Ежемесячно',    'Monthly'],
    yearly:     ['Ежегодно',      'Yearly'],
    weekly:     ['Еженедельно',   'Weekly'],
    quarterly:  ['Ежеквартально', 'Quarterly'],
    'one-time': ['Разовый',       'One-time'],
    trial:      ['Пробный',       'Trial'],
  };
  const pair = labels[cycle];
  return pair ? pair[isRu ? 0 : 1] : cycle;
}

export function formatReportDate(iso: string, isRu: boolean): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}
