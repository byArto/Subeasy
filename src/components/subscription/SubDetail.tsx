'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Subscription, Category, AppSettings, Currency } from '@/lib/types';
import { cn, getDaysUntilPayment, convertCurrency } from '@/lib/utils';
import { CURRENCY_SYMBOLS, CYCLE_LABELS } from '@/lib/constants';
import { Badge, Button } from '@/components/ui';

/* ── Types ── */

interface SubDetailProps {
  subscription: Subscription;
  category?: Category;
  settings: AppSettings;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

/* ── Helpers ── */

const CYCLE_SUFFIX: Record<string, string> = {
  monthly: '/мес',
  yearly: '/год',
  weekly: '/нед',
  'one-time': '',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTotalSpent(sub: Subscription): number {
  if (sub.cycle === 'one-time') return sub.price;

  const start = new Date(sub.startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs <= 0) return 0;

  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let payments: number;
  switch (sub.cycle) {
    case 'weekly':
      payments = Math.floor(diffDays / 7);
      break;
    case 'monthly':
      payments = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      break;
    case 'yearly':
      payments = now.getFullYear() - start.getFullYear();
      break;
    default:
      payments = 0;
  }

  return Math.max(1, payments) * sub.price;
}

function getStatusBadge(sub: Subscription) {
  if (!sub.isActive) {
    return { variant: 'neutral' as const, label: 'Приостановлена', pulse: false };
  }
  const days = getDaysUntilPayment(sub.nextPaymentDate);
  if (days < 0) return { variant: 'danger' as const, label: 'Просрочена', pulse: true };
  if (days === 0) return { variant: 'danger' as const, label: 'Сегодня', pulse: true };
  if (days === 1) return { variant: 'warning' as const, label: 'Завтра', pulse: false };
  if (days <= 3) return { variant: 'warning' as const, label: `Через ${days} дн.`, pulse: false };
  return { variant: 'success' as const, label: 'Активна', pulse: false };
}

/* ── Stagger ── */

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + i * 0.05, type: 'spring' as const, stiffness: 300, damping: 30 },
  }),
};

const btnVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.5 + i * 0.06, type: 'spring' as const, stiffness: 300, damping: 30 },
  }),
};

/* ── Count-up hook ── */

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/* ── Component ── */

export function SubDetail({
  subscription: sub,
  category,
  settings,
  onClose: _onClose,
  onEdit,
  onToggleActive,
  onDelete,
}: SubDetailProps) {
  const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;
  const days = getDaysUntilPayment(sub.nextPaymentDate);
  const status = getStatusBadge(sub);
  const totalSpent = getTotalSpent(sub);
  const animatedPrice = useCountUp(Math.round(sub.price));

  // Equivalent in other currency
  const altCurrency: Currency = sub.currency === 'RUB' ? 'USD' : 'RUB';
  const altSymbol = CURRENCY_SYMBOLS[altCurrency];
  const altPrice = Math.round(
    convertCurrency(sub.price, sub.currency, altCurrency, settings.exchangeRate)
  );

  const [confirmDelete, setConfirmDelete] = useState(false);

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Стоимость',
      value: `${sub.price.toLocaleString('ru-RU')} ${symbol} ${CYCLE_SUFFIX[sub.cycle] || ''}`,
    },
    {
      label: 'Метод оплаты',
      value: sub.paymentMethod || '—',
    },
    {
      label: 'Дата начала',
      value: formatDate(sub.startDate),
    },
    {
      label: 'Следующий платёж',
      value: (
        <span className="flex items-center gap-2">
          {formatDate(sub.nextPaymentDate)}
          {sub.isActive && (
            <Badge
              variant={days <= 1 ? 'danger' : days <= 7 ? 'warning' : 'neutral'}
            >
              {days < 0
                ? 'просрочен'
                : days === 0
                  ? 'сегодня'
                  : days === 1
                    ? 'завтра'
                    : `${days} дн.`}
            </Badge>
          )}
        </span>
      ),
    },
    {
      label: 'Цикл',
      value: CYCLE_LABELS[sub.cycle] || sub.cycle,
    },
    {
      label: 'Всего потрачено',
      value: (
        <span className="text-neon">
          {`≈ ${Math.round(totalSpent).toLocaleString('ru-RU')} ${symbol}`}
        </span>
      ),
    },
    {
      label: 'Заметки',
      value: sub.notes || '—',
    },
  ];

  return (
    <div className="space-y-6 pb-2">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-col items-center gap-3 pt-2"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: `linear-gradient(135deg, ${sub.color}30, ${sub.color}10)`,
            boxShadow: `0 0 24px ${sub.color}15`,
          }}
        >
          {sub.icon}
        </div>

        {/* Name */}
        <h2 className="font-display font-bold text-xl text-text-primary text-center leading-tight">
          {sub.name}
        </h2>

        {/* Category + Status */}
        <div className="flex items-center gap-2">
          {category && (
            <span className="text-xs text-text-secondary">
              {category.emoji} {category.name}
            </span>
          )}
          <Badge variant={status.variant} pulse={status.pulse}>
            {status.label}
          </Badge>
        </div>
      </motion.div>

      {/* ── Main Price ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 30 }}
        className="text-center py-3"
      >
        <p className="font-display font-extrabold text-[48px] leading-none text-neon neon-text tabular-nums">
          {animatedPrice.toLocaleString('ru-RU')}
          <span className="text-xl font-bold ml-1">{symbol}</span>
        </p>
        <p className="text-text-muted text-sm mt-1.5">
          {CYCLE_SUFFIX[sub.cycle] ? CYCLE_LABELS[sub.cycle]?.toLowerCase() : 'разовый платёж'}
          {' · '}
          <span className="text-text-secondary">
            ≈ {altPrice.toLocaleString('ru-RU')} {altSymbol}
          </span>
        </p>
      </motion.div>

      {/* ── Detail Rows ── */}
      <div className="bg-surface-2 rounded-2xl border border-border-subtle overflow-hidden">
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            custom={i}
            variants={rowVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              'flex items-start justify-between gap-4 px-4 py-3.5',
              i < rows.length - 1 && 'border-b border-border-subtle'
            )}
          >
            <span className="text-xs text-text-secondary shrink-0 pt-0.5">{row.label}</span>
            <span className="text-sm text-text-primary font-medium text-right">{row.value}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="space-y-2.5 pt-1">
        <motion.div custom={0} variants={btnVariants} initial="hidden" animate="visible">
          <Button fullWidth variant="secondary" size="lg" onClick={onEdit}>
            Редактировать
          </Button>
        </motion.div>

        <motion.div custom={1} variants={btnVariants} initial="hidden" animate="visible">
          <Button
            fullWidth
            variant={sub.isActive ? 'secondary' : 'primary'}
            size="md"
            onClick={onToggleActive}
          >
            {sub.isActive ? 'Приостановить' : 'Возобновить'}
          </Button>
        </motion.div>

        <motion.div custom={2} variants={btnVariants} initial="hidden" animate="visible">
          {!confirmDelete ? (
            <Button fullWidth variant="ghost" size="md" onClick={() => setConfirmDelete(true)}>
              <span className="text-danger">Удалить</span>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button fullWidth variant="secondary" size="md" onClick={() => setConfirmDelete(false)}>
                Отмена
              </Button>
              <Button fullWidth variant="danger" size="md" onClick={onDelete}>
                Да, удалить
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
