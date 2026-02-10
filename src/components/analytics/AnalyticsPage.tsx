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
} from 'recharts';
import { Subscription, Category, AppSettings, Currency } from '@/lib/types';
import { getMonthlyPrice, convertCurrency, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

/* ── Props ── */

interface AnalyticsPageProps {
  subscriptions: Subscription[];
  categories: Category[];
  settings: AppSettings;
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

/* ── Component ── */

export function AnalyticsPage({ subscriptions, categories, settings }: AnalyticsPageProps) {
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
        <MonthComparison
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
   СЕКЦИЯ 2: Сравнение с прошлым месяцем
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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeSubs = subscriptions.filter((s) => s.isActive);

  // Current month: all active subscriptions monthly total
  const currentTotal = activeSubs.reduce(
    (sum, s) => sum + getMonthlyInCurrency(s, displayCurrency, exchangeRate), 0,
  );

  // Previous month: subscriptions that existed before start of current month
  const prevMonthSubs = activeSubs.filter((s) => new Date(s.startDate) < startOfMonth);
  const prevTotal = prevMonthSubs.reduce(
    (sum, s) => sum + getMonthlyInCurrency(s, displayCurrency, exchangeRate), 0,
  );

  const hasEnoughData = prevMonthSubs.length > 0 && prevTotal > 0;
  const diff = hasEnoughData ? currentTotal - prevTotal : 0;
  const pct = hasEnoughData ? Math.round((diff / prevTotal) * 100) : 0;
  const isUp = diff > 0;

  return (
    <div>
      <SectionHeader title="Сравнение" />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
        {hasEnoughData ? (
          <div className="flex items-center gap-3">
            {/* This month */}
            <div className="flex-1 text-center">
              <p className="text-[11px] text-text-muted mb-1">Этот месяц</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">
                {formatAmount(Math.round(currentTotal))} {symbol}
              </p>
            </div>

            {/* Arrow + percentage */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <span className={cn('text-lg', isUp ? 'text-danger' : 'text-neon')}>
                {isUp ? '↑' : '↓'}
              </span>
              <span className={cn(
                'text-xs font-bold',
                isUp ? 'text-danger' : 'text-neon',
              )}>
                {isUp ? '+' : ''}{pct}%
              </span>
            </div>

            {/* Previous month */}
            <div className="flex-1 text-center">
              <p className="text-[11px] text-text-muted mb-1">Прошлый месяц</p>
              <p className="text-sm font-bold text-text-secondary tabular-nums">
                {formatAmount(Math.round(prevTotal))} {symbol}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-text-muted py-2">
            Недостаточно данных для сравнения
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 3: Круговая диаграмма
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
   СЕКЦИЯ 4: Топ-3 самых дорогих
   ═══════════════════════════════════════ */

const MEDALS = ['🥇', '🥈', '🥉'];

function TopExpensive({
  active,
  displayCurrency,
  exchangeRate,
  symbol,
  monthlyTotal,
}: {
  active: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
  symbol: string;
  monthlyTotal: number;
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
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface-2 rounded-2xl border border-border-subtle p-4"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-lg">{MEDALS[i]}</span>
                <span className="text-lg">{sub.icon}</span>
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 5: График расходов по месяцам
   ═══════════════════════════════════════ */

interface MonthPoint {
  label: string;
  total: number;
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
  const data = useMemo(() => {
    const active = subscriptions.filter((s) => s.isActive);
    if (active.length === 0) return [];

    const now = new Date();
    const points: MonthPoint[] = [];

    // Go back up to 11 months from current month
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      // Subscriptions that were active during this month
      const subsForMonth = active.filter((s) => {
        const start = new Date(s.startDate);
        return start <= monthEnd;
      });

      if (subsForMonth.length === 0 && points.length === 0) continue;

      const total = subsForMonth.reduce(
        (sum, s) => sum + getMonthlyInCurrency(s, displayCurrency, exchangeRate), 0,
      );

      points.push({
        label: MONTH_NAMES_SHORT[d.getMonth()],
        total: Math.round(total),
      });
    }

    return points;
  }, [subscriptions, displayCurrency, exchangeRate]);

  if (data.length < 2) {
    return (
      <div>
        <SectionHeader title="Динамика расходов" />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-6">
          <p className="text-center text-xs text-text-muted">
            Копим данные для графика...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Динамика расходов" />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 pr-1">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF41" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00FF41" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.03)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<NeonTooltip symbol={symbol} />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#00FF41"
              strokeWidth={2}
              fill="url(#neonGrad)"
              dot={{ fill: '#00FF41', r: 3, strokeWidth: 0 }}
              activeDot={{ fill: '#00FF41', r: 5, strokeWidth: 0, style: { filter: 'drop-shadow(0 0 6px rgba(0,255,65,0.6))' } }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Custom Tooltip ── */

function NeonTooltip({ active, payload, symbol }: { active?: boolean; payload?: Array<{ value: number }>; symbol: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-neon/30 rounded-lg px-3 py-1.5 shadow-neon">
      <span className="text-sm font-semibold text-text-primary tabular-nums">
        {formatAmount(payload[0].value)} {symbol}
      </span>
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
