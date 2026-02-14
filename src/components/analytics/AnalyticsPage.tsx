'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Subscription, Category, AppSettings, Currency } from '@/lib/types';
import { getMonthlyPrice, convertCurrency, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { ServiceLogo } from '@/components/ui/ServiceLogo';

/* ── Props ── */

interface AnalyticsPageProps {
  subscriptions: Subscription[];
  categories: Category[];
  settings: AppSettings;
  onSubTap?: (sub: Subscription) => void;
}

/* ── Stagger ── */

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: 'spring' as const, stiffness: 300, damping: 30 },
  }),
};

/* ── Helpers ── */

type Period = 'month' | 'quarter' | 'year';
const PERIOD_LABELS: Record<Period, string> = { month: 'Месяц', quarter: 'Квартал', year: 'Год' };
const PERIOD_MULTIPLIER: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

const MONTH_NAMES_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function getMonthlyInCurrency(sub: Subscription, currency: string, rate: number): number {
  const monthly = getMonthlyPrice(sub);
  return convertCurrency(monthly, sub.currency as Currency, currency as Currency, rate);
}

function formatAmount(n: number): string {
  if (n >= 1000) return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

/** Total monthly cost of all subs active during a given month */
function getMonthlyTotal(
  subscriptions: Subscription[],
  year: number,
  month: number,
  rate: number,
  displayCurrency: string,
): number {
  const monthEnd = new Date(year, month + 1, 0); // last day of month
  return subscriptions
    .filter((sub) => {
      if (!sub.isActive) return false;
      return new Date(sub.startDate) <= monthEnd;
    })
    .reduce((total, sub) => {
      const monthly = getMonthlyPrice(sub);
      return total + convertCurrency(monthly, sub.currency as Currency, displayCurrency as Currency, rate);
    }, 0);
}

/** Days since a date */
function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format duration in human-readable form */
function formatDuration(days: number): string {
  if (days < 30) return `${days} дн.`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} мес.`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `${years} г.`;
  return `${years} г. ${remMonths} мес.`;
}

/* ── Component ── */

export function AnalyticsPage({ subscriptions, categories, settings, onSubTap }: AnalyticsPageProps) {
  const { displayCurrency, exchangeRate } = settings;
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  const altCurrency = displayCurrency === 'RUB' ? 'USD' : 'RUB';
  const altSymbol = CURRENCY_SYMBOLS[altCurrency];

  const active = useMemo(() => subscriptions.filter((s) => s.isActive), [subscriptions]);

  const monthlyTotal = useMemo(
    () => active.reduce((sum, s) => sum + getMonthlyInCurrency(s, displayCurrency, exchangeRate), 0),
    [active, displayCurrency, exchangeRate],
  );

  const monthlyTotalAlt = useMemo(
    () => active.reduce((sum, s) => sum + getMonthlyInCurrency(s, altCurrency, exchangeRate), 0),
    [active, altCurrency, exchangeRate],
  );

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-5 gap-3">
        <span className="text-5xl">📊</span>
        <p className="text-text-secondary text-sm font-medium">Аналитика</p>
        <p className="text-text-muted text-xs">Добавьте подписки чтобы увидеть аналитику</p>
      </div>
    );
  }

  let idx = 0;

  return (
    <div className="space-y-6 px-5 pt-2 pb-4">
      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <PeriodTotal
          monthlyTotal={monthlyTotal}
          monthlyTotalAlt={monthlyTotalAlt}
          symbol={symbol}
          altSymbol={altSymbol}
        />
      </motion.div>

      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <InsightsBadges
          active={active}
          subscriptions={subscriptions}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          symbol={symbol}
          onSubTap={onSubTap}
        />
      </motion.div>

      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <ForecastSection
          subscriptions={subscriptions}
          active={active}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          symbol={symbol}
          monthlyTotal={monthlyTotal}
        />
      </motion.div>

      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <MonthComparison
          subscriptions={subscriptions}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          symbol={symbol}
        />
      </motion.div>

      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SpendingTimeline
          subscriptions={subscriptions}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          symbol={symbol}
        />
      </motion.div>

      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <CategoryBreakdown
          active={active}
          categories={categories}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          symbol={symbol}
          monthlyTotal={monthlyTotal}
        />
      </motion.div>

      <motion.div custom={idx++} variants={sectionVariants} initial="hidden" animate="visible">
        <TopExpensive
          active={active}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          symbol={symbol}
          monthlyTotal={monthlyTotal}
          onSubTap={onSubTap}
        />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 1: Period Switcher + Total
   ═══════════════════════════════════════ */

function PeriodTotal({
  monthlyTotal,
  monthlyTotalAlt,
  symbol,
  altSymbol,
}: {
  monthlyTotal: number;
  monthlyTotalAlt: number;
  symbol: string;
  altSymbol: string;
}) {
  const [period, setPeriod] = useState<Period>('month');
  const multiplier = PERIOD_MULTIPLIER[period];
  const total = monthlyTotal * multiplier;
  const totalAlt = monthlyTotalAlt * multiplier;

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-subtle p-5">
      {/* Period pills */}
      <div className="flex gap-1.5 bg-surface-3 rounded-xl p-1 mb-5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <motion.button
            key={p}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPeriod(p)}
            className={cn(
              'relative flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
              period === p ? 'text-surface' : 'text-text-secondary',
            )}
          >
            {period === p && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-lg bg-neon"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{PERIOD_LABELS[p]}</span>
          </motion.button>
        ))}
      </div>

      {/* Amount */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-display font-extrabold text-[40px] leading-none text-neon neon-text tabular-nums">
              {formatAmount(Math.round(total))}
              <span className="text-2xl ml-1 opacity-70">{symbol}</span>
            </p>
            <p className="text-xs text-text-muted mt-2">
              ≈ {formatAmount(Math.round(totalAlt))} {altSymbol}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 2: Insights Badges
   "Самая дорогая" + "Самая долгая"
   ═══════════════════════════════════════ */

function InsightsBadges({
  active,
  subscriptions,
  displayCurrency,
  exchangeRate,
  symbol,
  onSubTap,
}: {
  active: Subscription[];
  subscriptions: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
  onSubTap?: (sub: Subscription) => void;
}) {
  const mostExpensive = useMemo(() => {
    if (active.length === 0) return null;
    let best: Subscription | null = null;
    let bestMonthly = 0;
    for (const s of active) {
      const m = getMonthlyInCurrency(s, displayCurrency, exchangeRate);
      if (m > bestMonthly) {
        bestMonthly = m;
        best = s;
      }
    }
    return best ? { sub: best, monthly: bestMonthly } : null;
  }, [active, displayCurrency, exchangeRate]);

  const longest = useMemo(() => {
    const allActive = subscriptions.filter((s) => s.isActive && s.cycle !== 'one-time' && s.cycle !== 'trial');
    if (allActive.length === 0) return null;
    let best: Subscription | null = null;
    let bestDays = 0;
    for (const s of allActive) {
      const d = daysSince(s.startDate);
      if (d > bestDays) {
        bestDays = d;
        best = s;
      }
    }
    return best ? { sub: best, days: bestDays } : null;
  }, [subscriptions]);

  if (!mostExpensive && !longest) return null;

  return (
    <div>
      <SectionHeader title="Инсайты" />
      <div className="grid grid-cols-2 gap-3">
        {/* Most Expensive */}
        {mostExpensive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSubTap?.(mostExpensive.sub)}
            className="relative bg-surface-2 rounded-2xl border border-border-subtle p-4 overflow-hidden text-left active:bg-surface-3 transition-colors"
          >
            {/* Glow accent */}
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: mostExpensive.sub.color }}
            />

            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs">👑</span>
                <span className="text-[10px] font-bold text-warning uppercase tracking-wider">
                  Дорогая
                </span>
              </div>

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2.5"
                style={{
                  background: `linear-gradient(135deg, ${mostExpensive.sub.color}30, ${mostExpensive.sub.color}10)`,
                }}
              >
                <ServiceLogo name={mostExpensive.sub.name} emoji={mostExpensive.sub.icon} size={24} />
              </div>

              <p className="text-sm font-semibold text-text-primary truncate">
                {mostExpensive.sub.name}
              </p>
              <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                {formatAmount(Math.round(mostExpensive.monthly))}
                <span className="text-xs text-text-muted ml-0.5">{symbol}/мес</span>
              </p>
            </div>
          </motion.button>
        )}

        {/* Longest */}
        {longest && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 30 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSubTap?.(longest.sub)}
            className="relative bg-surface-2 rounded-2xl border border-border-subtle p-4 overflow-hidden text-left active:bg-surface-3 transition-colors"
          >
            {/* Glow accent */}
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: longest.sub.color }}
            />

            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs">⏳</span>
                <span className="text-[10px] font-bold text-neon uppercase tracking-wider">
                  Долгая
                </span>
              </div>

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2.5"
                style={{
                  background: `linear-gradient(135deg, ${longest.sub.color}30, ${longest.sub.color}10)`,
                }}
              >
                <ServiceLogo name={longest.sub.name} emoji={longest.sub.icon} size={24} />
              </div>

              <p className="text-sm font-semibold text-text-primary truncate">
                {longest.sub.name}
              </p>
              <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                {formatDuration(longest.days)}
              </p>
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 3: Прогноз на следующий месяц
   ═══════════════════════════════════════ */

function ForecastSection({
  subscriptions,
  active,
  displayCurrency,
  exchangeRate,
  symbol,
  monthlyTotal,
}: {
  subscriptions: Subscription[];
  active: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
  monthlyTotal: number;
}) {
  const forecast = useMemo(() => {
    const now = new Date();
    const nextMonth = now.getMonth() + 1;
    const nextYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;

    // Base forecast: current active subs that will still be active next month
    const baseForecast = getMonthlyTotal(subscriptions, nextYear, nextMonthNorm, exchangeRate, displayCurrency);

    // Trials converting next month — their price will kick in
    const trialConversions = subscriptions.filter((s) => {
      if (s.cycle !== 'trial' || !s.isActive) return false;
      const endDate = new Date(s.nextPaymentDate);
      return endDate.getMonth() === nextMonthNorm && endDate.getFullYear() === nextYear;
    });

    const trialExtra = trialConversions.reduce((sum, s) => {
      return sum + convertCurrency(s.price, s.currency as Currency, displayCurrency as Currency, exchangeRate);
    }, 0);

    const totalForecast = baseForecast + trialExtra;
    const diff = totalForecast - monthlyTotal;
    const pct = monthlyTotal > 0 ? Math.round((diff / monthlyTotal) * 100) : 0;

    return {
      total: totalForecast,
      diff,
      pct,
      trialCount: trialConversions.length,
      nextMonthLabel: MONTH_NAMES_SHORT[nextMonthNorm],
    };
  }, [subscriptions, active, displayCurrency, exchangeRate, monthlyTotal]);

  return (
    <div>
      <SectionHeader title="Прогноз" />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-text-muted mb-0.5">
              Ожидаемые расходы · {forecast.nextMonthLabel}
            </p>
            <p className="text-2xl font-display font-bold text-text-primary tabular-nums">
              {formatAmount(Math.round(forecast.total))}
              <span className="text-sm text-text-muted ml-1">{symbol}</span>
            </p>
          </div>

          {/* Change indicator */}
          <div className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold',
            forecast.diff > 0
              ? 'bg-danger/10 text-danger'
              : forecast.diff < 0
                ? 'bg-neon/10 text-neon'
                : 'bg-surface-4 text-text-muted',
          )}>
            <span>
              {forecast.diff > 0 ? '↑' : forecast.diff < 0 ? '↓' : '='}
            </span>
            <span className="tabular-nums">
              {forecast.diff > 0 ? '+' : ''}{forecast.pct}%
            </span>
          </div>
        </div>

        {/* Forecast bar comparing current vs next */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-muted w-14 shrink-0">Сейчас</span>
            <div className="flex-1 h-2 rounded-full bg-surface-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full bg-neon/50"
              />
            </div>
            <span className="text-[11px] text-text-muted tabular-nums w-16 text-right shrink-0">
              {formatAmount(Math.round(monthlyTotal))} {symbol}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-muted w-14 shrink-0">{forecast.nextMonthLabel}</span>
            <div className="flex-1 h-2 rounded-full bg-surface-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: monthlyTotal > 0
                    ? `${Math.min((forecast.total / monthlyTotal) * 100, 100)}%`
                    : '100%',
                }}
                transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: forecast.diff > 0 ? '#FF4444' : '#00FF41',
                }}
              />
            </div>
            <span className="text-[11px] text-text-primary font-medium tabular-nums w-16 text-right shrink-0">
              {formatAmount(Math.round(forecast.total))} {symbol}
            </span>
          </div>
        </div>

        {forecast.trialCount > 0 && (
          <p className="text-[11px] text-warning mt-3">
            {forecast.trialCount} {forecast.trialCount === 1 ? 'триал закончится' : 'триала закончатся'} в {forecast.nextMonthLabel.toLowerCase()}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 4: Сравнение с прошлым месяцем
   ═══════════════════════════════════════ */

function MonthComparison({
  subscriptions,
  displayCurrency,
  exchangeRate,
  symbol,
}: {
  subscriptions: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthTotal = getMonthlyTotal(subscriptions, currentYear, currentMonth, exchangeRate, displayCurrency);

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthTotal = getMonthlyTotal(subscriptions, prevYear, prevMonth, exchangeRate, displayCurrency);

  const diff = thisMonthTotal - lastMonthTotal;
  const pct = lastMonthTotal > 0 ? Math.round((diff / lastMonthTotal) * 100) : 0;
  const isUp = diff > 0;
  const isNewPeriod = lastMonthTotal === 0 && thisMonthTotal > 0;

  return (
    <div>
      <SectionHeader title="Сравнение" />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-center gap-3">
          {/* This month */}
          <div className="flex-1 text-center">
            <p className="text-[11px] text-text-muted mb-1">Этот месяц</p>
            <p className="text-sm font-bold text-text-primary tabular-nums">
              {formatAmount(Math.round(thisMonthTotal))} {symbol}
            </p>
          </div>

          {/* Arrow + percentage */}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            {isNewPeriod ? (
              <span className="text-xs font-bold text-neon">NEW</span>
            ) : (
              <>
                <span className={cn('text-lg', isUp ? 'text-danger' : diff < 0 ? 'text-neon' : 'text-text-muted')}>
                  {isUp ? '↑' : diff < 0 ? '↓' : '='}
                </span>
                <span className={cn(
                  'text-xs font-bold',
                  isUp ? 'text-danger' : diff < 0 ? 'text-neon' : 'text-text-muted',
                )}>
                  {isUp ? '+' : ''}{pct}%
                </span>
              </>
            )}
          </div>

          {/* Previous month */}
          <div className="flex-1 text-center">
            <p className="text-[11px] text-text-muted mb-1">Прошлый месяц</p>
            <p className="text-sm font-bold text-text-secondary tabular-nums">
              {formatAmount(Math.round(lastMonthTotal))} {symbol}
            </p>
          </div>
        </div>

        {isNewPeriod && (
          <p className="text-center text-[11px] text-text-muted mt-2">
            Новый период отслеживания
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 5: Тренд-график (с переключателем)
   ═══════════════════════════════════════ */

type TimelineRange = '7d' | '30d' | '3m' | '12m';
const TIMELINE_RANGES: { value: TimelineRange; label: string }[] = [
  { value: '7d', label: '7 дн' },
  { value: '30d', label: '30 дн' },
  { value: '3m', label: 'Кварт.' },
  { value: '12m', label: 'Год' },
];

/** How many months back for each range */
const RANGE_MONTHS: Record<TimelineRange, number> = { '7d': 1, '30d': 1, '3m': 3, '12m': 12 };

interface TimelinePoint {
  label: string;
  total: number;
  forecast?: number;
}

function SpendingTimeline({
  subscriptions,
  displayCurrency,
  exchangeRate,
  symbol,
}: {
  subscriptions: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
}) {
  const [range, setRange] = useState<TimelineRange>('12m');

  const { data, growth, avgTotal } = useMemo(() => {
    const now = new Date();
    const points: TimelinePoint[] = [];
    const monthsBack = RANGE_MONTHS[range];

    if (range === '7d' || range === '30d') {
      // Daily granularity for 7d / 30d
      const daysBack = range === '7d' ? 7 : 30;
      for (let i = daysBack - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        // Approximate: use the monthly total for the month this day falls in
        const total = getMonthlyTotal(subscriptions, d.getFullYear(), d.getMonth(), exchangeRate, displayCurrency);
        // Scale to daily cost
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const dailyCost = total / daysInMonth;

        points.push({
          label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
          total: Math.round(dailyCost),
        });
      }
    } else {
      // Monthly granularity for 3m / 12m
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const total = getMonthlyTotal(subscriptions, d.getFullYear(), d.getMonth(), exchangeRate, displayCurrency);

        points.push({
          label: MONTH_NAMES_SHORT[d.getMonth()],
          total: Math.round(total),
        });
      }

      // Add next month forecast
      const nextD = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const forecastTotal = getMonthlyTotal(subscriptions, nextD.getFullYear(), nextD.getMonth(), exchangeRate, displayCurrency);
      points.push({
        label: MONTH_NAMES_SHORT[nextD.getMonth()],
        total: 0,
        forecast: Math.round(forecastTotal),
      });
    }

    // Calculate growth: compare last 3 months average vs 3 months before that
    const withData = points.filter((p) => p.total > 0);
    let growthPct = 0;
    if (range === '12m' && withData.length >= 4) {
      const recent = withData.slice(-3);
      const older = withData.slice(-6, -3);
      if (older.length > 0) {
        const recentAvg = recent.reduce((s, p) => s + p.total, 0) / recent.length;
        const olderAvg = older.reduce((s, p) => s + p.total, 0) / older.length;
        if (olderAvg > 0) growthPct = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
      }
    }

    // Average
    const totals = points.filter((p) => p.total > 0);
    const avg = totals.length > 0 ? totals.reduce((s, p) => s + p.total, 0) / totals.length : 0;

    return { data: points, growth: growthPct, avgTotal: Math.round(avg) };
  }, [subscriptions, displayCurrency, exchangeRate, range]);

  const hasAnyData = data.some((p) => p.total > 0);
  const monthsWithData = data.filter((p) => p.total > 0).length;

  if (!hasAnyData) {
    return (
      <div>
        <SectionHeader title="Динамика расходов" />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-6">
          <p className="text-center text-xs text-text-muted">
            Добавьте подписки для аналитики
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 pl-1 pr-1">
        <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          Динамика расходов
        </h3>
        {growth !== 0 && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold',
            growth > 0 ? 'bg-danger/10 text-danger' : 'bg-neon/10 text-neon',
          )}>
            <span>{growth > 0 ? '↑' : '↓'}</span>
            <span className="tabular-nums">{growth > 0 ? '+' : ''}{growth}%</span>
            <span className="text-text-muted font-medium">тренд</span>
          </div>
        )}
      </div>

      {/* Range switcher */}
      <div className="flex gap-1 bg-surface-3 rounded-xl p-1 mb-3">
        {TIMELINE_RANGES.map((r) => (
          <motion.button
            key={r.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => setRange(r.value)}
            className={cn(
              'relative flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
              range === r.value ? 'text-surface' : 'text-text-secondary',
            )}
          >
            {range === r.value && (
              <motion.span
                layoutId="timeline-pill"
                className="absolute inset-0 rounded-lg bg-neon"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{r.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 pr-1">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF41" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00FF41" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFB800" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#FFB800" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.03)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={range === '30d' ? 4 : range === '7d' ? 0 : 1}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<NeonTooltip symbol={symbol} />} />
            {avgTotal > 0 && (
              <ReferenceLine
                y={avgTotal}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 4"
                label={{
                  value: `ср. ${formatAmount(avgTotal)}`,
                  fill: 'rgba(255,255,255,0.2)',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="total"
              stroke="#00FF41"
              strokeWidth={2}
              fill="url(#neonGrad)"
              dot={{ fill: '#00FF41', r: 2.5, strokeWidth: 0 }}
              activeDot={{ fill: '#00FF41', r: 5, strokeWidth: 0, style: { filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.6))' } }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#FFB800"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="url(#forecastGrad)"
              dot={{ fill: '#FFB800', r: 3, strokeWidth: 0 }}
              activeDot={{ fill: '#FFB800', r: 5, strokeWidth: 0 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-neon" />
            <span className="text-[10px] text-text-muted">Факт</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-warning opacity-60" style={{ borderTop: '1px dashed #FFB800' }} />
            <span className="text-[10px] text-text-muted">Прогноз</span>
          </div>
        </div>

        {monthsWithData < 2 && (
          <p className="text-center text-[11px] text-text-muted mt-2">
            Копим историю... Данные за {monthsWithData} мес.
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 6: Круговая диаграмма
   ═══════════════════════════════════════ */

interface CategoryData {
  name: string;
  emoji: string;
  value: number;
  color: string;
  pct: number;
}

function CategoryBreakdown({
  active,
  categories,
  displayCurrency,
  exchangeRate,
  symbol,
  monthlyTotal,
}: {
  active: Subscription[];
  categories: Category[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
  monthlyTotal: number;
}) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of active) {
      const monthly = getMonthlyInCurrency(s, displayCurrency, exchangeRate);
      map.set(s.category, (map.get(s.category) || 0) + monthly);
    }

    const result: CategoryData[] = [];
    for (const [catId, value] of map) {
      const cat = categories.find((c) => c.id === catId);
      result.push({
        name: cat?.name || 'Другое',
        emoji: cat?.emoji || '📦',
        value: Math.round(value),
        color: cat?.color || '#8E8E93',
        pct: monthlyTotal > 0 ? Math.round((value / monthlyTotal) * 100) : 0,
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [active, categories, displayCurrency, exchangeRate, monthlyTotal]);

  if (data.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Расходы по категориям" />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
        {/* Pie chart */}
        <div className="flex justify-center mb-4">
          <div className="relative w-[200px] h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  strokeWidth={0}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-text-primary tabular-nums">
                {formatAmount(Math.round(monthlyTotal))}
              </span>
              <span className="text-[10px] text-text-muted">{symbol}/мес</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm shrink-0">{d.emoji}</span>
              <span className="text-sm text-text-primary flex-1 truncate">{d.name}</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
                {formatAmount(d.value)} {symbol}
              </span>
              <span className="text-[11px] text-text-muted w-8 text-right tabular-nums shrink-0">
                {d.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 7: Топ-3 самых дорогих
   ═══════════════════════════════════════ */

const MEDALS = ['🥇', '🥈', '🥉'];

function TopExpensive({
  active,
  displayCurrency,
  exchangeRate,
  symbol,
  monthlyTotal,
  onSubTap,
}: {
  active: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
  monthlyTotal: number;
  onSubTap?: (sub: Subscription) => void;
}) {
  const top3 = useMemo(() => {
    return active
      .map((s) => ({
        sub: s,
        monthly: getMonthlyInCurrency(s, displayCurrency, exchangeRate),
      }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 3);
  }, [active, displayCurrency, exchangeRate]);

  if (top3.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Самые дорогие" />
      <div className="space-y-2.5">
        {top3.map(({ sub, monthly }, i) => {
          const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0;
          const isYearly = sub.cycle === 'yearly';

          return (
            <motion.button
              key={sub.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 30 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSubTap?.(sub)}
              className="w-full bg-surface-2 rounded-2xl border border-border-subtle p-4 text-left active:bg-surface-3 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-lg">{MEDALS[i]}</span>
                <span className="text-lg"><ServiceLogo name={sub.name} emoji={sub.icon} size={22} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{sub.name}</p>
                  {isYearly && (
                    <p className="text-[10px] text-text-muted">(годовая)</p>
                  )}
                </div>
                <span className="text-sm font-bold text-text-primary tabular-nums shrink-0">
                  {formatAmount(Math.round(monthly))} {symbol}/мес
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-surface-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: sub.color,
                    boxShadow: i === 0 ? `0 0 8px ${sub.color}60` : undefined,
                  }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Custom Tooltip ── */

function NeonTooltip({ active, payload, symbol }: { active?: boolean; payload?: Array<{ value: number; dataKey?: string }>; symbol: string }) {
  if (!active || !payload?.length) return null;

  const item = payload.find((p) => p.value > 0);
  if (!item) return null;

  const isForecast = item.dataKey === 'forecast';

  return (
    <div className={cn(
      'border rounded-lg px-3 py-1.5',
      isForecast
        ? 'bg-surface-3 border-warning/30'
        : 'bg-surface-3 border-neon/30 shadow-neon',
    )}>
      <span className="text-sm font-semibold text-text-primary tabular-nums">
        {isForecast ? '~' : ''}{formatAmount(item.value)} {symbol}
      </span>
      {isForecast && (
        <span className="text-[10px] text-warning ml-1">прогноз</span>
      )}
    </div>
  );
}

/* ── Section Header ── */

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2 pl-1">
      {title}
    </h3>
  );
}
