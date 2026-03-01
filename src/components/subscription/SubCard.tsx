'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Subscription, BillingCycle } from '@/lib/types';
import { Badge } from '@/components/ui';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { cn, getDaysUntilPayment } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Lang } from '@/lib/translations';
import { haptic } from '@/lib/haptic';

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

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

const cycleSuffixKey: Record<BillingCycle, string> = {
  monthly: 'cycle.monthly',
  yearly: 'cycle.yearly',
  weekly: 'cycle.weekly',
  'one-time': '',
  trial: '',
};

function getPaymentStatus(sub: Subscription, notifyDaysBefore = 7, t: TFunc) {
  if (!sub.isActive) {
    return { label: t('status.inactive'), variant: 'neutral' as const, pulse: false };
  }

  const days = getDaysUntilPayment(sub.nextPaymentDate);

  if (sub.cycle === 'trial') {
    if (days < 0) return { label: t('status.trial.expired'), variant: 'danger' as const, pulse: true };
    if (days === 0) return { label: t('status.trial.lastDay'), variant: 'danger' as const, pulse: true };
    if (days === 1) return { label: t('status.trial.tomorrow'), variant: 'danger' as const, pulse: true };
    if (days <= notifyDaysBefore) return { label: t('status.trial.daysLeft', { days }), variant: 'warning' as const, pulse: false };
    return { label: t('status.trial.daysLeft', { days }), variant: 'success' as const, pulse: false };
  }

  if (days < 0) {
    return { label: t('status.overdue'), variant: 'danger' as const, pulse: true };
  }
  if (days <= 1) {
    return { label: days === 0 ? t('status.today') : t('status.tomorrow'), variant: 'danger' as const, pulse: true };
  }
  if (days <= notifyDaysBefore) {
    return { label: t('status.days', { days }), variant: 'warning' as const, pulse: false };
  }
  return { label: t('status.active'), variant: 'success' as const, pulse: false };
}

function formatNextPayment(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
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
  const { lang, t } = useLanguage();
  const status = getPaymentStatus(sub, notifyDaysBefore, t);
  const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;
  const days = getDaysUntilPayment(sub.nextPaymentDate);
  const isOverdue = sub.isActive && days < 0 && sub.cycle !== 'one-time' && sub.cycle !== 'trial';

  const dragX = useMotionValue(0);
  const revealedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const justDeletedRef = useRef(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

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
    if (justDeletedRef.current) return; // hold-delete just fired — ignore spurious click
    if (revealedRef.current) {
      snapTo(0);
    } else {
      onTap?.(sub);
    }
  }

  function handleHoldStart(e: React.PointerEvent) {
    e.stopPropagation();
    holdStartRef.current = performance.now();
    const duration = 2000;
    function tick() {
      const elapsed = performance.now() - holdStartRef.current;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        holdTimerRef.current = null;
        setHoldProgress(0);
        haptic.error();
        justDeletedRef.current = true;
        snapTo(0);
        setTimeout(() => { onDelete?.(sub); justDeletedRef.current = false; }, 300);
      } else {
        holdTimerRef.current = requestAnimationFrame(tick);
      }
    }
    holdTimerRef.current = requestAnimationFrame(tick);
  }

  function handleHoldEnd() {
    if (holdTimerRef.current !== null) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  }

  const cardRadius = isOverdue ? 'rounded-t-2xl' : 'rounded-2xl';
  const dateFormatted = formatNextPayment(sub.nextPaymentDate, lang);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{
        delay: Math.min((index ?? 0) * 0.025, 0.15),
        type: 'spring',
        stiffness: 450,
        damping: 35,
      }}
      className="flex flex-col"
    >
      {/* Swipe container */}
      <div className={cn('relative overflow-hidden', cardRadius)}>
        {/* Delete action — hidden at rest, revealed on swipe */}
        {onDelete && (
          <motion.button
            style={{ opacity: deleteOpacity }}
            onPointerDown={handleHoldStart}
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
            onPointerCancel={handleHoldEnd}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-[80px] flex flex-col items-center justify-center gap-1 bg-danger overflow-hidden select-none touch-none"
          >
            {/* Hold progress fill from bottom */}
            <div
              className="absolute inset-0 bg-red-800"
              style={{ transform: `scaleY(${holdProgress / 100})`, transformOrigin: 'bottom', transition: 'none' }}
            />
            <TrashIcon className="relative w-5 h-5 text-white z-10" />
            <span className="relative text-white text-[10px] font-semibold z-10">
              {holdProgress > 0 ? `${Math.round(holdProgress)}%` : t('list.delete')}
            </span>
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
                  ? t('payment.trial', { date: dateFormatted })
                  : days < 0
                    ? t('payment.overdue', { date: dateFormatted })
                    : t('payment.next', { date: dateFormatted })}
              </p>
            </div>

            {/* Right — price */}
            <div className="text-right shrink-0">
              {sub.cycle === 'trial' ? (
                <>
                  <p className="text-sm font-bold text-neon tabular-nums">FREE</p>
                  {sub.price > 0 && (
                    <p className="text-[10px] text-text-muted">
                      {t('payment.later')} {Math.round(sub.price).toLocaleString('ru-RU')}{symbol}
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
                    {cycleSuffixKey[sub.cycle] ? t(cycleSuffixKey[sub.cycle]) : ''}
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
          {t('payment.markPaid')}
        </button>
      )}
    </motion.div>
  );
}
