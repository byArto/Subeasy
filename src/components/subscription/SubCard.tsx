'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Subscription, BillingCycle } from '@/lib/types';
import { Badge } from '@/components/ui';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { cn, getDaysUntilPayment } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface SubCardProps {
  subscription: Subscription;
  index?: number;
  onTap?: (sub: Subscription) => void;
  onMarkPaid?: (sub: Subscription) => void;
  onDelete?: (sub: Subscription) => void;
  insightBadge?: 'expensive' | 'longest' | null;
  notifyDaysBefore?: number;
  className?: string;
}

const cycleSuffix: Record<BillingCycle, string> = {
  monthly: '/мес',
  yearly: '/год',
  weekly: '/нед',
  'one-time': '',
  trial: '',
};

function getPaymentStatus(sub: Subscription, notifyDaysBefore = 7) {
  if (!sub.isActive) {
    return { label: 'Неактивна', variant: 'neutral' as const, pulse: false };
  }

  const days = getDaysUntilPayment(sub.nextPaymentDate);

  if (sub.cycle === 'trial') {
    if (days < 0) return { label: 'Триал истёк', variant: 'danger' as const, pulse: true };
    if (days === 0) return { label: 'Последний день!', variant: 'danger' as const, pulse: true };
    if (days === 1) return { label: 'Завтра истекает!', variant: 'danger' as const, pulse: true };
    if (days <= notifyDaysBefore) return { label: `${days} дн. осталось`, variant: 'warning' as const, pulse: false };
    return { label: `${days} дн. осталось`, variant: 'success' as const, pulse: false };
  }

  if (days < 0) {
    return { label: 'Просрочена', variant: 'danger' as const, pulse: true };
  }
  if (days <= 1) {
    return { label: days === 0 ? 'Сегодня!' : 'Завтра!', variant: 'danger' as const, pulse: true };
  }
  if (days <= notifyDaysBefore) {
    return { label: `${days} дн.`, variant: 'warning' as const, pulse: false };
  }
  return { label: 'Активна', variant: 'success' as const, pulse: false };
}

function formatNextPayment(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const REVEAL_X = -80;
const REVEAL_THRESHOLD = -50;

export function SubCard({
  subscription: sub,
  index = 0,
  onTap,
  onMarkPaid,
  onDelete,
  insightBadge,
  notifyDaysBefore = 7,
  className,
}: SubCardProps) {
  const status = getPaymentStatus(sub, notifyDaysBefore);
  const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;
  const days = getDaysUntilPayment(sub.nextPaymentDate);
  const isOverdue = sub.isActive && days < 0 && sub.cycle !== 'one-time' && sub.cycle !== 'trial';

  const dragX = useMotionValue(0);
  const revealedRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Fade delete button in as card is swiped — fully hidden at rest (x=0)
  const deleteOpacity = useTransform(dragX, [-30, 0], [1, 0]);

  function snapTo(x: number) {
    revealedRef.current = x < 0;
    animate(dragX, x, { type: 'spring', stiffness: 500, damping: 35 });
  }

  function handleDragStart() {
    isDraggingRef.current = true;
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    isDraggingRef.current = false;
    if (info.offset.x < REVEAL_THRESHOLD) {
      snapTo(REVEAL_X);
    } else {
      snapTo(0);
    }
  }

  function handleCardTap() {
    if (revealedRef.current) {
      snapTo(0);
    } else {
      onTap?.(sub);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    snapTo(0);
    setTimeout(() => onDelete?.(sub), 150);
  }

  const cardRadius = isOverdue ? 'rounded-t-2xl' : 'rounded-2xl';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
      transition={{
        delay: index * 0.04,
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className="flex flex-col"
    >
      {/* Swipe container */}
      <div className={cn('relative overflow-hidden', cardRadius)}>
        {/* Delete action — hidden at rest, revealed on swipe */}
        {onDelete && (
          <motion.button
            onClick={handleDelete}
            style={{ opacity: deleteOpacity }}
            className="absolute right-0 top-0 bottom-0 w-[80px] flex flex-col items-center justify-center gap-1 bg-danger active:bg-danger/80"
          >
            <TrashIcon className="w-5 h-5 text-white" />
            <span className="text-white text-[10px] font-semibold">Удалить</span>
          </motion.button>
        )}

        {/* Draggable card layer */}
        <motion.div
          style={{ x: dragX }}
          drag={onDelete ? 'x' : false}
          dragConstraints={{ left: REVEAL_X, right: 0 }}
          dragElastic={{ left: 0.05, right: 0.02 }}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className="relative z-10"
        >
          <motion.button
            whileTap={{ scale: isDraggingRef.current ? 1 : 0.98 }}
            onClick={handleCardTap}
            className={cn(
              'w-full flex items-center gap-3.5 p-3.5',
              'bg-surface-2 border border-border-subtle',
              cardRadius,
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
              <ServiceLogo name={sub.name} emoji={sub.icon} size={24} />
            </div>

            {/* Center — name + next payment */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary truncate">
                  {sub.name}
                </span>
                {insightBadge === 'expensive' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-warning/10 border border-warning/20 text-[9px] font-bold text-warning uppercase tracking-wide leading-none">
                    👑
                  </span>
                )}
                {insightBadge === 'longest' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-neon/10 border border-neon/20 text-[9px] font-bold text-neon uppercase tracking-wide leading-none">
                    ⏳
                  </span>
                )}
                <Badge variant={status.variant} pulse={status.pulse}>
                  {status.label}
                </Badge>
              </div>

              <p className="text-xs text-text-muted mt-0.5 truncate">
                {sub.cycle === 'trial'
                  ? `Триал до · ${formatNextPayment(sub.nextPaymentDate)}`
                  : days < 0
                    ? `Просрочен · ${formatNextPayment(sub.nextPaymentDate)}`
                    : `Следующий · ${formatNextPayment(sub.nextPaymentDate)}`}
              </p>
            </div>

            {/* Right — price */}
            <div className="text-right shrink-0">
              {sub.cycle === 'trial' ? (
                <>
                  <p className="text-sm font-bold text-neon tabular-nums">FREE</p>
                  {sub.price > 0 && (
                    <p className="text-[10px] text-text-muted">
                      далее {Math.round(sub.price).toLocaleString('ru-RU')}{symbol}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-text-primary tabular-nums">
                    {Math.round(sub.price).toLocaleString('ru-RU')}
                    <span className="text-text-muted text-xs ml-0.5">{symbol}</span>
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {cycleSuffix[sub.cycle]}
                  </p>
                </>
              )}
            </div>
          </motion.button>
        </motion.div>
      </div>

      {/* Quick "Paid" strip for overdue subs */}
      {isOverdue && onMarkPaid && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkPaid(sub);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-neon/10 border border-t-0 border-border-subtle rounded-b-2xl text-neon text-xs font-semibold active:bg-neon/20 transition-colors"
        >
          ✓ Оплачено
        </button>
      )}
    </motion.div>
  );
}
