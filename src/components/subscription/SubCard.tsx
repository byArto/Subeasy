'use client';

import { motion } from 'framer-motion';
import { Subscription, BillingCycle } from '@/lib/types';
import { Badge } from '@/components/ui';
import { cn, getDaysUntilPayment } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface SubCardProps {
  subscription: Subscription;
  index?: number;
  onTap?: (sub: Subscription) => void;
  className?: string;
}

const cycleSuffix: Record<BillingCycle, string> = {
  monthly: '/мес',
  yearly: '/год',
  weekly: '/нед',
  'one-time': '',
};

function getPaymentStatus(sub: Subscription) {
  if (!sub.isActive) {
    return { label: 'Неактивна', variant: 'neutral' as const, pulse: false };
  }

  const days = getDaysUntilPayment(sub.nextPaymentDate);

  if (days < 0) {
    return { label: 'Просрочена', variant: 'danger' as const, pulse: true };
  }
  if (days <= 1) {
    return { label: days === 0 ? 'Сегодня!' : 'Завтра!', variant: 'danger' as const, pulse: true };
  }
  if (days <= 7) {
    return { label: `${days} дн.`, variant: 'warning' as const, pulse: false };
  }
  return { label: 'Активна', variant: 'success' as const, pulse: false };
}

function formatNextPayment(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function SubCard({
  subscription: sub,
  index = 0,
  onTap,
  className,
}: SubCardProps) {
  const status = getPaymentStatus(sub);
  const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;
  const days = getDaysUntilPayment(sub.nextPaymentDate);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{
        delay: index * 0.04,
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap?.(sub)}
      className={cn(
        'w-full flex items-center gap-3.5 p-3.5',
        'bg-surface-2 rounded-2xl border border-border-subtle',
        'text-left transition-colors active:bg-surface-3',
        className
      )}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 text-lg"
        style={{
          background: `linear-gradient(135deg, ${sub.color}22, ${sub.color}44)`,
          boxShadow: `inset 0 0 0 1px ${sub.color}30`,
        }}
      >
        {sub.icon}
      </div>

      {/* Center — name + next payment */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary truncate">
            {sub.name}
          </span>
          <Badge variant={status.variant} pulse={status.pulse}>
            {status.label}
          </Badge>
        </div>

        <p className="text-xs text-text-muted mt-0.5 truncate">
          {days < 0
            ? `Просрочен · ${formatNextPayment(sub.nextPaymentDate)}`
            : `Следующий · ${formatNextPayment(sub.nextPaymentDate)}`}
        </p>
      </div>

      {/* Right — price */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-text-primary tabular-nums">
          {Math.round(sub.price).toLocaleString('ru-RU')}
          <span className="text-text-muted text-xs ml-0.5">{symbol}</span>
        </p>
        <p className="text-[10px] text-text-muted">
          {cycleSuffix[sub.cycle]}
        </p>
      </div>
    </motion.button>
  );
}
