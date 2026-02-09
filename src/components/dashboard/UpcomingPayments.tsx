'use client';

import { motion } from 'framer-motion';
import { Subscription, DisplayCurrency } from '@/lib/types';
import { cn, getDaysUntilPayment } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface UpcomingPaymentsProps {
  subscriptions: Subscription[]; // already filtered & sorted by getUpcomingPayments
  currency: DisplayCurrency;
  maxItems?: number;
  className?: string;
}

function getDotColor(days: number): string {
  if (days <= 2) return 'bg-danger';
  if (days <= 7) return 'bg-warning';
  return 'bg-neon';
}

function formatRelativeDate(days: number): string {
  if (days < 0) return 'Просрочено';
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  return `Через ${days} дн.`;
}

export function UpcomingPayments({
  subscriptions,
  currency,
  maxItems = 5,
  className,
}: UpcomingPaymentsProps) {
  const items = subscriptions.slice(0, maxItems);

  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Ближайшие платежи
        </h3>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* Payment list */}
      <div className="space-y-1">
        {items.map((sub, i) => {
          const days = getDaysUntilPayment(sub.nextPaymentDate);
          const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;

          return (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
              className="flex items-center gap-3 py-2.5 px-1"
            >
              {/* Color dot */}
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  getDotColor(days)
                )}
              />

              {/* Icon + Name */}
              <span className="text-sm shrink-0">{sub.icon}</span>
              <span className="flex-1 text-sm text-text-primary font-medium truncate">
                {sub.name}
              </span>

              {/* Date */}
              <span
                className={cn(
                  'text-xs shrink-0',
                  days <= 2 ? 'text-danger font-semibold' : 'text-text-muted'
                )}
              >
                {formatRelativeDate(days)}
              </span>

              {/* Price */}
              <span className="text-sm text-text-primary font-semibold tabular-nums shrink-0">
                {Math.round(sub.price).toLocaleString('ru-RU')}
                <span className="text-text-muted text-xs ml-0.5">{symbol}</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
