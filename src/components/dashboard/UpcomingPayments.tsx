'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subscription, DisplayCurrency } from '@/lib/types';
import { cn, getDaysUntilPayment } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface UpcomingPaymentsProps {
  subscriptions: Subscription[]; // already filtered & sorted by getUpcomingPayments
  currency: DisplayCurrency;
  maxItems?: number;
  onSubTap?: (sub: Subscription) => void;
  className?: string;
}

function getDotColor(days: number): string {
  if (days <= 2) return 'bg-danger';
  if (days <= 7) return 'bg-warning';
  return 'bg-neon';
}

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function formatRelativeDate(days: number, t: TFunc): string {
  if (days < 0) return t('dashboard.overdue');
  if (days === 0) return t('dashboard.today');
  if (days === 1) return t('dashboard.tomorrow');
  return t('dashboard.inDays', { days });
}

const INITIAL_VISIBLE = 1;

export function UpcomingPayments({
  subscriptions,
  currency: _currency,
  maxItems = 20,
  onSubTap,
  className,
}: UpcomingPaymentsProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const allItems = subscriptions.slice(0, maxItems);
  const visibleItems = showAll ? allItems : allItems.slice(0, INITIAL_VISIBLE);
  const hiddenCount = allItems.length - INITIAL_VISIBLE;

  if (allItems.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t('dashboard.upcoming')}
        </h3>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* Payment list */}
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {visibleItems.map((sub, i) => {
            const days = getDaysUntilPayment(sub.nextPaymentDate);
            const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;

            return (
              <motion.button
                key={sub.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i < INITIAL_VISIBLE ? i * 0.05 : 0, type: 'spring', stiffness: 300, damping: 30 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSubTap?.(sub)}
                className="w-full flex items-center gap-3 py-2.5 px-1 text-left active:bg-surface-2 rounded-lg transition-colors overflow-hidden"
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', getDotColor(days))} />
                <span className="text-sm shrink-0">
                  <ServiceLogo name={sub.name} emoji={sub.icon} size={18} />
                </span>
                <span className="flex-1 text-sm text-text-primary font-medium truncate">
                  {sub.name}
                </span>
                <span className={cn('text-xs shrink-0', days <= 2 ? 'text-danger font-semibold' : 'text-text-muted')}>
                  {formatRelativeDate(days, t)}
                </span>
                <span className="text-sm text-text-primary font-semibold tabular-nums shrink-0">
                  {Math.round(sub.price).toLocaleString('ru-RU')}
                  <span className="text-text-muted text-xs ml-0.5">{symbol}</span>
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Show more / less */}
        {hiddenCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowAll((p) => !p)}
            className="w-full py-2 text-xs font-semibold text-text-muted active:text-text-secondary transition-colors text-center"
          >
            {showAll ? '↑' : `+ ${t('dashboard.showMore', { count: hiddenCount })}`}
          </motion.button>
        )}
      </div>
    </div>
  );
}
