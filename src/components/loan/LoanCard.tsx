'use client';

import { motion } from 'framer-motion';
import type { Subscription } from '@/lib/types';
import { Badge } from '@/components/ui';
import { cn, getDaysUntilPayment, getThemeAccentColor } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { loanProgressPct } from '@/lib/loanUtils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { haptic } from '@/lib/haptic';

interface LoanCardProps {
  obligation: Subscription;
  index?: number;
  onTap?: (o: Subscription) => void;
}

function getLoanTypeLabel(loanType?: string, lang?: string): string {
  const ru: Record<string, string> = {
    consumer: 'Потреб', auto: 'Авто', installment: 'Рассрочка',
    debt: 'Долг', mortgage: 'Ипотека',
  };
  const en: Record<string, string> = {
    consumer: 'Consumer', auto: 'Auto', installment: 'Installment',
    debt: 'Debt', mortgage: 'Mortgage',
  };
  const map = lang === 'en' ? en : ru;
  return loanType ? (map[loanType] ?? loanType) : (lang === 'en' ? 'Loan' : 'Кредит');
}

function getPaymentBadge(nextPaymentDate: string, t: (k: string, v?: Record<string, string | number>) => string) {
  const days = getDaysUntilPayment(nextPaymentDate);
  if (days < 0) return { label: t('status.overdue'), variant: 'danger' as const };
  if (days === 0) return { label: t('status.today'), variant: 'danger' as const };
  if (days === 1) return { label: t('status.tomorrow'), variant: 'warning' as const };
  if (days <= 7) return { label: t('status.days', { days }), variant: 'warning' as const };
  return { label: t('status.active'), variant: 'success' as const };
}

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function LoanCard({ obligation: o, index = 0, onTap }: LoanCardProps) {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const accentColor = getThemeAccentColor(o.color, theme);
  const symbol = CURRENCY_SYMBOLS[o.currency] || o.currency;
  const badge = getPaymentBadge(o.nextPaymentDate, t);

  const monogram = (o.lender ?? o.name).charAt(0).toUpperCase();
  const typeLabel = getLoanTypeLabel(o.loanType, lang);
  const dateLabel = formatDate(o.nextPaymentDate, lang);

  const progress = o.principalAmount && o.outstandingBalance !== undefined
    ? loanProgressPct(o.principalAmount, o.outstandingBalance)
    : 0;

  const balance = o.outstandingBalance ?? 0;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{
        delay: Math.min(index * 0.025, 0.15),
        type: 'spring', stiffness: 450, damping: 35,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { haptic.tap(); onTap?.(o); }}
      className="w-full text-left bg-surface-2 rounded-2xl p-4 flex flex-col gap-3"
    >
      {/* Top row: monogram + name/type + status */}
      <div className="flex items-center gap-3">
        {/* Monogram */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[17px] shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          {monogram}
        </div>

        {/* Name first, then bank · type */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-text truncate">{o.name}</p>
          <p className="text-[12px] text-text-secondary truncate">
            {o.lender && o.lender !== o.name ? `${o.lender} · ${typeLabel}` : typeLabel}
          </p>
        </div>

        {/* Payment status badge */}
        <Badge variant={badge.variant} pulse={badge.variant === 'danger'}>
          {badge.label}
        </Badge>
      </div>

      {/* Balance + payment row */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-text-secondary mb-0.5">
            {lang === 'en' ? 'Outstanding balance' : 'Остаток долга'}
          </p>
          <p className="text-[22px] font-bold text-text leading-none">
            {balance.toLocaleString('ru-RU')} {symbol}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-text-secondary mb-0.5">
            {lang === 'en' ? 'Monthly payment' : 'Ежемесячно'}
          </p>
          <p className="text-[15px] font-semibold" style={{ color: accentColor }}>
            {o.price.toLocaleString('ru-RU')} {symbol}
          </p>
          <p className="text-[11px] text-text-secondary">{dateLabel}</p>
        </div>
      </div>

      {/* Progress bar (only if principalAmount is known) */}
      {o.principalAmount != null && o.principalAmount > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: accentColor }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ delay: index * 0.025 + 0.1, duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-text-secondary">
            {lang === 'en'
              ? `${progress}% paid`
              : `Выплачено ${progress}%`}
          </p>
        </div>
      )}
    </motion.button>
  );
}
