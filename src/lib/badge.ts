import { DisplayCurrency } from '@/lib/types';

export interface SpendBadge {
  emoji: string;
  labelKey: string;
}

export function getSpendBadge(monthlyAmount: number, currency: DisplayCurrency): SpendBadge {
  // Normalize to RUB equivalent for tier calculation
  const rub = currency === 'USD' ? monthlyAmount * 90 : monthlyAmount;

  if (rub < 300) return { emoji: '📱', labelKey: 'badge.ordinary' };
  if (rub < 1000) return { emoji: '🧘', labelKey: 'badge.monk' };
  if (rub < 5000) return { emoji: '🔥', labelKey: 'badge.maniac' };
  if (rub < 20000) return { emoji: '👑', labelKey: 'badge.king' };
  if (rub < 50000) return { emoji: '🐋', labelKey: 'badge.whale' };
  return { emoji: '💎', labelKey: 'badge.legend' };
}
