'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Subscription, Category, AppSettings, Currency } from '@/lib/types';
import { cn, getDaysUntilPayment, convertCurrency, sanitizeUrl } from '@/lib/utils';
import { CURRENCY_SYMBOLS, DEFAULT_CATEGORY_NAME_KEYS } from '@/lib/constants';
import { Badge, Button } from '@/components/ui';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { haptic } from '@/lib/haptic';

/* ── Types ── */

interface SubDetailProps {
  subscription: Subscription;
  category?: Category;
  settings: AppSettings;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onMarkPaid?: () => void;
  onDelete: () => void;
}

/* ── Helpers ── */

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

const CYCLE_SUFFIX_KEY: Record<string, string> = {
  monthly: 'cycle.monthly',
  yearly: 'cycle.yearly',
  weekly: 'cycle.weekly',
  'one-time': '',
  trial: '',
};

const CYCLE_LABEL_KEY: Record<string, string> = {
  monthly: 'cycle.monthly.label',
  yearly: 'cycle.yearly.label',
  weekly: 'cycle.weekly.label',
  'one-time': 'cycle.oneTime.label',
  trial: 'cycle.trial.label',
};

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function getTotalSpent(sub: Subscription): number {
  if (sub.cycle === 'trial') return 0;
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

function getStatusBadge(sub: Subscription, t: TFunc) {
  if (!sub.isActive) {
    return { variant: 'neutral' as const, label: t('status.paused'), pulse: false };
  }
  const days = getDaysUntilPayment(sub.nextPaymentDate);

  if (sub.cycle === 'trial') {
    if (days < 0) return { variant: 'danger' as const, label: t('status.trial.expired'), pulse: true };
    if (days === 0) return { variant: 'danger' as const, label: t('status.trial.lastDay'), pulse: true };
    if (days <= 3) return { variant: 'warning' as const, label: t('status.trial.daysLeft', { days }), pulse: false };
    return { variant: 'success' as const, label: t('status.trial.daysLeft', { days }), pulse: false };
  }

  if (days < 0) return { variant: 'danger' as const, label: t('status.overdue'), pulse: true };
  if (days === 0) return { variant: 'danger' as const, label: t('status.today'), pulse: true };
  if (days === 1) return { variant: 'warning' as const, label: t('status.tomorrow'), pulse: false };
  if (days <= 3) return { variant: 'warning' as const, label: t('status.days', { days }), pulse: false };
  return { variant: 'success' as const, label: t('status.active'), pulse: false };
}

/* ── Payment method display ── */

function formatPaymentMethod(raw: string, t: TFunc): React.ReactNode {
  if (raw.startsWith('card:')) {
    const rest = raw.substring(5);
    const idx = rest.indexOf(':');
    const ct = idx >= 0 ? rest.substring(0, idx) : 'physical';
    const name = idx >= 0 ? rest.substring(idx + 1).trim() : '';
    const typeLabel = ct === 'virtual' ? t('detail.virtual') : t('detail.physical');
    return (
      <span className="flex flex-col items-end gap-0.5">
        <span>💳 {typeLabel} {t('detail.card')}</span>
        {name && <span className="text-text-muted text-xs">{name}</span>}
      </span>
    );
  }
  if (raw.startsWith('crypto:')) {
    const detail = raw.substring(7).trim();
    return detail ? <span>🪙 {detail}</span> : <span>🪙 {t('detail.crypto')}</span>;
  }
  if (raw.startsWith('sbp:')) {
    const detail = raw.substring(4).trim();
    return detail ? <span>⚡ {t('detail.sbp')} · {detail}</span> : <span>⚡ {t('detail.sbp')}</span>;
  }
  if (raw.startsWith('paypal:')) {
    const detail = raw.substring(7).trim();
    return detail ? <span>🅿 PayPal · {detail}</span> : <span>🅿 PayPal</span>;
  }
  if (raw.startsWith('other:')) {
    const detail = raw.substring(6).trim();
    return <span>{detail || t('detail.other')}</span>;
  }
  // Legacy string values
  return <span>{raw || '—'}</span>;
}

function getCostPerDay(sub: Subscription): number | null {
  switch (sub.cycle) {
    case 'monthly': return sub.price / 30.44;
    case 'yearly': return sub.price / 365;
    case 'weekly': return sub.price / 7;
    default: return null;
  }
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
  onMarkPaid,
  onDelete,
}: SubDetailProps) {
  const { t, lang } = useLanguage();
  const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;
  const days = getDaysUntilPayment(sub.nextPaymentDate);
  const status = getStatusBadge(sub, t);
  const totalSpent = getTotalSpent(sub);
  const animatedPrice = useCountUp(Math.round(sub.price));

  // Equivalent in other currency
  const altCurrency: Currency = sub.currency === 'RUB' ? 'USD' : 'RUB';
  const altSymbol = CURRENCY_SYMBOLS[altCurrency];
  const altPrice = Math.round(
    convertCurrency(sub.price, sub.currency, altCurrency, settings.exchangeRate)
  );

  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleHoldStart = useCallback(() => {
    let progress = 0;
    holdTimerRef.current = setInterval(() => {
      progress += 4;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        setHoldProgress(0);
        haptic.error();
        onDelete();
      }
    }, 100);
  }, [onDelete]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  }, []);

  const isTrial = sub.cycle === 'trial';
  const costPerDay = getCostPerDay(sub);

  const cycleSuffix = CYCLE_SUFFIX_KEY[sub.cycle] ? t(CYCLE_SUFFIX_KEY[sub.cycle]) : '';

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: isTrial ? t('detail.costAfterTrial') : t('detail.cost'),
      value: isTrial
        ? (sub.price > 0
            ? `${sub.price.toLocaleString('ru-RU')} ${symbol}`
            : t('detail.freeCancel'))
        : `${sub.price.toLocaleString('ru-RU')} ${symbol} ${cycleSuffix}`,
    },
    ...(costPerDay !== null
      ? [{
          label: t('detail.perDay'),
          value: `${costPerDay < 1 ? costPerDay.toFixed(2) : costPerDay.toFixed(1)} ${symbol}`,
        }]
      : []),
    {
      label: t('detail.paymentMethod'),
      value: formatPaymentMethod(sub.paymentMethod, t),
    },
    {
      label: isTrial ? t('detail.trialStart') : t('detail.startDate'),
      value: formatDate(sub.startDate, lang),
    },
    {
      label: isTrial ? t('detail.trialEnd') : t('detail.nextPayment'),
      value: (
        <span className="flex items-center gap-2">
          {formatDate(sub.nextPaymentDate, lang)}
          {sub.isActive && (
            <Badge
              variant={days <= 1 ? 'danger' : days <= 7 ? 'warning' : 'neutral'}
            >
              {isTrial
                ? (days < 0
                    ? t('detail.expired')
                    : days === 0
                      ? t('detail.lastDay')
                      : t('detail.daysLeft', { days }))
                : (days < 0
                    ? t('detail.overdue')
                    : days === 0
                      ? t('detail.today')
                      : days === 1
                        ? t('detail.tomorrow')
                        : t('detail.daysLeft', { days }))}
            </Badge>
          )}
        </span>
      ),
    },
    {
      label: t('detail.cycle'),
      value: isTrial ? t('detail.trialPeriod') : (CYCLE_LABEL_KEY[sub.cycle] ? t(CYCLE_LABEL_KEY[sub.cycle]) : sub.cycle),
    },
    ...(isTrial
      ? []
      : [{
          label: t('detail.totalSpent'),
          value: (
            <span className="text-neon">
              {`≈ ${Math.round(totalSpent).toLocaleString('ru-RU')} ${symbol}`}
            </span>
          ),
        }]),
    ...(sanitizeUrl(sub.managementUrl)
      ? [{
          label: t('detail.management'),
          value: (
            <a
              href={sanitizeUrl(sub.managementUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon underline underline-offset-2 break-all"
              onClick={(e) => {
                e.stopPropagation();
                const safeUrl = sanitizeUrl(sub.managementUrl);
                const tgWebApp = window.Telegram?.WebApp;
                if (tgWebApp && safeUrl) {
                  e.preventDefault();
                  tgWebApp.openLink(safeUrl);
                }
              }}
            >
              {t('detail.openLink')}
            </a>
          ),
        }]
      : []),
    {
      label: t('detail.notes'),
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
          <ServiceLogo name={sub.name} emoji={sub.icon} size={36} />
        </div>

        {/* Name */}
        <h2 className="font-display font-bold text-xl text-text-primary text-center leading-tight">
          {sub.name}
        </h2>

        {/* Category + Status */}
        <div className="flex items-center gap-2">
          {category && (
            <span className="text-xs text-text-secondary">
              {category.emoji} {DEFAULT_CATEGORY_NAME_KEYS[category.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[category.id]) : category.name}
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
        {isTrial ? (
          <>
            <p className="font-display font-extrabold text-[48px] leading-none text-neon neon-text">
              FREE
            </p>
            <p className="text-text-muted text-sm mt-1.5">
              {t('detail.trialPeriodLabel')}
              {sub.price > 0 && (
                <>
                  {` · ${t('detail.further')} `}
                  <span className="text-text-secondary">
                    {sub.price.toLocaleString('ru-RU')} {symbol}
                  </span>
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="font-display font-extrabold text-[48px] leading-none text-neon neon-text tabular-nums">
              {animatedPrice.toLocaleString('ru-RU')}
              <span className="text-xl font-bold ml-1">{symbol}</span>
            </p>
            <p className="text-text-muted text-sm mt-1.5">
              {CYCLE_SUFFIX_KEY[sub.cycle] ? t(CYCLE_LABEL_KEY[sub.cycle]).toLowerCase() : t('detail.oneTimePayment')}
              {' · '}
              <span className="text-text-secondary">
                ≈ {altPrice.toLocaleString('ru-RU')} {altSymbol}
              </span>
            </p>
          </>
        )}
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
        {/* Mark Paid — only for overdue recurring subs */}
        {onMarkPaid && sub.isActive && days < 0 && sub.cycle !== 'one-time' && (
          <motion.div custom={0} variants={btnVariants} initial="hidden" animate="visible">
            <Button fullWidth variant="primary" size="lg" onClick={onMarkPaid}>
              <span className="flex items-center justify-center gap-2">
                {t('payment.markPaid')}
              </span>
            </Button>
          </motion.div>
        )}

        <motion.div custom={onMarkPaid && days < 0 ? 1 : 0} variants={btnVariants} initial="hidden" animate="visible">
          <Button fullWidth variant="secondary" size="lg" onClick={onEdit}>
            {t('detail.edit')}
          </Button>
        </motion.div>

        <motion.div custom={onMarkPaid && days < 0 ? 2 : 1} variants={btnVariants} initial="hidden" animate="visible">
          <Button
            fullWidth
            variant={sub.isActive ? 'secondary' : 'primary'}
            size="md"
            onClick={onToggleActive}
          >
            {sub.isActive ? t('detail.pause') : t('detail.resume')}
          </Button>
        </motion.div>

        <motion.div custom={onMarkPaid && days < 0 ? 3 : 2} variants={btnVariants} initial="hidden" animate="visible">
          <div className="relative overflow-hidden rounded-xl">
            {/* Hold progress fill */}
            <div
              className="absolute inset-0 bg-danger rounded-xl pointer-events-none"
              style={{ transform: `scaleX(${holdProgress / 100})`, transformOrigin: 'left', transition: 'none' }}
            />
            <button
              className={cn(
                'relative z-10 w-full min-h-[44px] flex items-center justify-center rounded-xl',
                'border border-danger/30 text-sm font-semibold select-none transition-colors',
                holdProgress > 0 ? 'text-white' : 'text-danger'
              )}
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerLeave={handleHoldEnd}
              onPointerCancel={handleHoldEnd}
            >
              {holdProgress > 0 ? t('detail.holdToDelete') : t('detail.delete')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
