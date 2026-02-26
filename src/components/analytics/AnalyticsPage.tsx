'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
import { CURRENCY_SYMBOLS, DEFAULT_CATEGORY_NAME_KEYS } from '@/lib/constants';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { usePro } from '@/components/providers/ProProvider';

/* ── Props ── */

interface AnalyticsPageProps {
  subscriptions: Subscription[];
  categories: Category[];
  settings: AppSettings;
  onSubTap?: (sub: Subscription) => void;
  onOpenPro?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
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
const PERIOD_MULTIPLIER: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

const MONTH_SHORT_KEYS = [
  'month.jan', 'month.feb', 'month.mar', 'month.apr',
  'month.may', 'month.jun', 'month.jul', 'month.aug',
  'month.sep', 'month.oct', 'month.nov', 'month.dec',
];

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

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
function formatDuration(days: number, t: TFunc): string {
  if (days < 30) return `${days} ${t('analytics.days')}`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} ${t('analytics.months')}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `${years} ${t('analytics.years')}`;
  return `${years} ${t('analytics.years')} ${remMonths} ${t('analytics.months')}`;
}

/* ── Component ── */

export function AnalyticsPage({ subscriptions, categories, settings, onSubTap, onOpenPro, onUpdateSettings }: AnalyticsPageProps) {
  const { t } = useLanguage();
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
        <p className="text-text-secondary text-sm font-medium">{t('nav.analytics')}</p>
        <p className="text-text-muted text-xs">{t('analytics.empty')}</p>
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
        <BudgetSection
          monthlyTotal={monthlyTotal}
          settings={settings}
          symbol={symbol}
          onOpenPro={onOpenPro}
          onUpdateSettings={onUpdateSettings}
          categories={categories}
          active={active}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
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
   СЕКЦИЯ PRO: Бюджетный лимит
   ═══════════════════════════════════════ */

interface CategorySpend {
  name: string;
  emoji: string;
  color: string;
  value: number;
  pct: number;
}

function BudgetSection({
  monthlyTotal,
  settings,
  symbol,
  onOpenPro,
  onUpdateSettings,
  categories,
  active,
  displayCurrency,
  exchangeRate,
}: {
  monthlyTotal: number;
  settings: AppSettings;
  symbol: string;
  onOpenPro?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  categories: Category[];
  active: Subscription[];
  displayCurrency: string;
  exchangeRate: number;
}) {
  const { t } = useLanguage();
  const { isPro, loading } = usePro();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const budget = settings.monthlyBudget ?? 0;
  const pct = budget > 0 ? Math.min((monthlyTotal / budget) * 100, 999) : 0;
  const remaining = budget - monthlyTotal;
  const isOver = remaining < 0;

  const barColor =
    pct >= 100 ? '#FF4444' :
    pct >= 90  ? '#FF6B00' :
    pct >= 70  ? '#FFB800' :
    '#00FF41';

  const topCategories = useMemo<CategorySpend[]>(() => {
    if (active.length === 0) return [];
    const map = new Map<string, number>();
    for (const s of active) {
      const monthly = getMonthlyInCurrency(s, displayCurrency, exchangeRate);
      map.set(s.category, (map.get(s.category) || 0) + monthly);
    }
    const result: CategorySpend[] = [];
    for (const [catId, value] of map) {
      const cat = categories.find((c) => c.id === catId);
      result.push({
        name: cat ? (DEFAULT_CATEGORY_NAME_KEYS[cat.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[cat.id]) : cat.name) : t('analytics.other'),
        emoji: cat?.emoji || '📦',
        color: cat?.color || '#8E8E93',
        value: Math.round(value),
        pct: monthlyTotal > 0 ? Math.round((value / monthlyTotal) * 100) : 0,
      });
    }
    return result.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [active, categories, displayCurrency, exchangeRate, monthlyTotal, t]);

  useEffect(() => {
    if (editing) {
      setInputVal(budget > 0 ? String(budget) : '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing, budget]);

  const handleSave = () => {
    const val = parseFloat(inputVal.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      onUpdateSettings?.({ monthlyBudget: Math.round(val) });
    }
    setEditing(false);
  };

  // While PRO status is loading — nothing
  if (loading) return null;

  // ── Non-PRO locked card ──
  if (!isPro) {
    return (
      <div>
        <SectionHeader title={t('budget.title')} />
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenPro}
          className="w-full bg-surface-2 rounded-2xl border border-border-subtle p-4 text-left outline-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0">
              <span className="text-lg">🔒</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t('budget.proLocked.title')}</p>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t('budget.proLocked.desc')}</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.3)' }}>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: '#f5c842' }}>PRO</span>
            </div>
          </div>
        </motion.button>
      </div>
    );
  }

  // ── PRO: budget not set ──
  if (budget === 0 && !editing) {
    return (
      <div>
        <SectionHeader title={t('budget.title')} />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setEditing(true)}
          className="w-full bg-surface-2 rounded-2xl border border-dashed border-neon/30 p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon/10 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text-primary">{t('budget.notSet')}</p>
              <p className="text-xs text-text-muted mt-0.5">{t('budget.setLimit')}</p>
            </div>
          </div>
          <span className="text-neon text-lg">+</span>
        </motion.button>
      </div>
    );
  }

  // ── PRO: inline edit mode ──
  if (editing) {
    return (
      <div>
        <SectionHeader title={t('budget.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-3">
          <div className="flex items-center bg-surface-3 rounded-xl px-3 gap-2 border border-border-subtle">
            <span className="text-text-muted text-sm shrink-0">{symbol}</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              placeholder={t('budget.placeholder')}
              className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none focus:outline-none focus-visible:outline-none tabular-nums"
            />
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="flex-1 py-2.5 bg-neon text-surface text-sm font-bold rounded-xl"
            >
              {t('budget.save')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 bg-surface-3 text-text-secondary text-sm font-semibold rounded-xl border border-border-subtle"
            >
              {t('budget.cancel')}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ── PRO: budget set — full view ──
  return (
    <div>
      <div className="flex items-center justify-between mb-2 pl-1 pr-1">
        <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          {t('budget.title')}
        </h3>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setEditing(true)}
          className="text-[11px] font-semibold text-neon"
        >
          {t('budget.edit')}
        </motion.button>
      </div>

      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-3">
        {/* Amount row */}
        <div className="flex items-end justify-between">
          <div>
            <AnimatePresence mode="wait">
              <motion.p
                key={String(Math.round(monthlyTotal))}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-2xl font-display font-bold tabular-nums"
                style={{ color: barColor }}
              >
                {formatAmount(Math.round(monthlyTotal))}
                <span className="text-sm ml-1 opacity-70">{symbol}</span>
              </motion.p>
            </AnimatePresence>
            <p className="text-xs text-text-muted mt-0.5">
              {t('budget.spent', { budget: formatAmount(budget), symbol })}
            </p>
          </div>

          {/* Status badge */}
          <div className={cn(
            'px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wide',
            pct >= 100 ? 'bg-danger/15 text-danger' :
            pct >= 90  ? 'bg-orange-500/15 text-orange-400' :
            pct >= 70  ? 'bg-warning/15 text-warning' :
            'bg-neon/10 text-neon',
          )}>
            {pct >= 100 ? t('budget.status.over') :
             pct >= 90  ? t('budget.status.danger') :
             pct >= 70  ? t('budget.status.warning') :
             t('budget.status.safe')}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-surface-4 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full relative"
            style={{
              backgroundColor: barColor,
              boxShadow: `0 0 8px ${barColor}60`,
            }}
          >
            {pct >= 95 && pct < 100 && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: barColor }}
              />
            )}
          </motion.div>
        </div>

        {/* Remaining / over */}
        <p className={cn('text-xs font-semibold', isOver ? 'text-danger' : 'text-neon')}>
          {isOver
            ? t('budget.over', { amount: formatAmount(Math.round(Math.abs(remaining))), symbol })
            : t('budget.remaining', { amount: formatAmount(Math.round(remaining)), symbol })}
        </p>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <div className="pt-2 border-t border-border-subtle space-y-2">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
              {t('budget.topCategories')}
            </p>
            {topCategories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <span className="text-sm shrink-0">{cat.emoji}</span>
                <div className="flex-1 h-1.5 rounded-full bg-surface-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <span className="text-[11px] text-text-secondary tabular-nums shrink-0 w-16 text-right">
                  {formatAmount(cat.value)} {symbol}
                </span>
                <span className="text-[10px] text-text-muted tabular-nums w-7 text-right shrink-0">
                  {cat.pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>('month');
  const multiplier = PERIOD_MULTIPLIER[period];
  const total = monthlyTotal * multiplier;
  const totalAlt = monthlyTotalAlt * multiplier;

  const periodLabels: Record<Period, string> = {
    month: t('analytics.period.month'),
    quarter: t('analytics.period.quarter'),
    year: t('analytics.period.year'),
  };

  return (
    <div className="bg-surface-2 rounded-2xl border border-border-subtle p-5">
      {/* Period pills */}
      <div className="flex gap-1.5 bg-surface-3 rounded-xl p-1 mb-5">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
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
            <span className="relative">{periodLabels[p]}</span>
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
  const { t } = useLanguage();

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
      <SectionHeader title={t('analytics.insights')} />
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
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: mostExpensive.sub.color }}
            />

            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs">👑</span>
                <span className="text-[10px] font-bold text-warning uppercase tracking-wider">
                  {t('analytics.expensive')}
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
                <span className="text-xs text-text-muted ml-0.5">{symbol}{t('cycle.monthly')}</span>
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
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: longest.sub.color }}
            />

            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs">⏳</span>
                <span className="text-[10px] font-bold text-neon uppercase tracking-wider">
                  {t('analytics.longest')}
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
                {formatDuration(longest.days, t)}
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
  const { t } = useLanguage();

  const forecast = useMemo(() => {
    const now = new Date();
    const nextMonth = now.getMonth() + 1;
    const nextYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;

    const baseForecast = getMonthlyTotal(subscriptions, nextYear, nextMonthNorm, exchangeRate, displayCurrency);

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
      nextMonthKey: MONTH_SHORT_KEYS[nextMonthNorm],
    };
  }, [subscriptions, active, displayCurrency, exchangeRate, monthlyTotal]);

  const nextMonthLabel = t(forecast.nextMonthKey);

  return (
    <div>
      <SectionHeader title={t('analytics.forecast')} />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-text-muted mb-0.5">
              {t('analytics.forecastDesc', { month: nextMonthLabel })}
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
            <span className="text-[11px] text-text-muted w-14 shrink-0">{t('analytics.now')}</span>
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
            <span className="text-[11px] text-text-muted w-14 shrink-0">{nextMonthLabel}</span>
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
            {forecast.trialCount === 1
              ? t('analytics.trialEnds', { count: forecast.trialCount })
              : t('analytics.trialsEnd', { count: forecast.trialCount })}{' '}
            {nextMonthLabel.toLowerCase()}
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
  const { t } = useLanguage();
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
      <SectionHeader title={t('analytics.comparison')} />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-center gap-3">
          {/* This month */}
          <div className="flex-1 text-center">
            <p className="text-[11px] text-text-muted mb-1">{t('analytics.thisMonth')}</p>
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
            <p className="text-[11px] text-text-muted mb-1">{t('analytics.lastMonth')}</p>
            <p className="text-sm font-bold text-text-secondary tabular-nums">
              {formatAmount(Math.round(lastMonthTotal))} {symbol}
            </p>
          </div>
        </div>

        {isNewPeriod && (
          <p className="text-center text-[11px] text-text-muted mt-2">
            {t('analytics.newPeriod')}
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
  const { t } = useLanguage();
  const [range, setRange] = useState<TimelineRange>('12m');

  const timelineRanges: { value: TimelineRange; label: string }[] = [
    { value: '7d', label: t('analytics.7d') },
    { value: '30d', label: t('analytics.30d') },
    { value: '3m', label: t('analytics.quarter') },
    { value: '12m', label: t('analytics.year') },
  ];

  const { data, growth, avgTotal } = useMemo(() => {
    const now = new Date();
    const points: TimelinePoint[] = [];
    const monthsBack = RANGE_MONTHS[range];

    if (range === '7d' || range === '30d') {
      const daysBack = range === '7d' ? 7 : 30;
      for (let i = daysBack - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const total = getMonthlyTotal(subscriptions, d.getFullYear(), d.getMonth(), exchangeRate, displayCurrency);
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const dailyCost = total / daysInMonth;

        points.push({
          label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
          total: Math.round(dailyCost),
        });
      }
    } else {
      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const total = getMonthlyTotal(subscriptions, d.getFullYear(), d.getMonth(), exchangeRate, displayCurrency);

        points.push({
          label: t(MONTH_SHORT_KEYS[d.getMonth()]),
          total: Math.round(total),
        });
      }

      // Add next month forecast
      const nextD = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const forecastTotal = getMonthlyTotal(subscriptions, nextD.getFullYear(), nextD.getMonth(), exchangeRate, displayCurrency);
      points.push({
        label: t(MONTH_SHORT_KEYS[nextD.getMonth()]),
        total: 0,
        forecast: Math.round(forecastTotal),
      });
    }

    // Calculate growth
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

    const totals = points.filter((p) => p.total > 0);
    const avg = totals.length > 0 ? totals.reduce((s, p) => s + p.total, 0) / totals.length : 0;

    return { data: points, growth: growthPct, avgTotal: Math.round(avg) };
  }, [subscriptions, displayCurrency, exchangeRate, range, t]);

  const hasAnyData = data.some((p) => p.total > 0);
  const monthsWithData = data.filter((p) => p.total > 0).length;

  if (!hasAnyData) {
    return (
      <div>
        <SectionHeader title={t('analytics.dynamics')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-6">
          <p className="text-center text-xs text-text-muted">
            {t('analytics.noData')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 pl-1 pr-1">
        <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          {t('analytics.dynamics')}
        </h3>
        {growth !== 0 && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold',
            growth > 0 ? 'bg-danger/10 text-danger' : 'bg-neon/10 text-neon',
          )}>
            <span>{growth > 0 ? '↑' : '↓'}</span>
            <span className="tabular-nums">{growth > 0 ? '+' : ''}{growth}%</span>
            <span className="text-text-muted font-medium">{t('analytics.trend')}</span>
          </div>
        )}
      </div>

      {/* Range switcher */}
      <div className="flex gap-1 bg-surface-3 rounded-xl p-1 mb-3">
        {timelineRanges.map((r) => (
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
                  value: `${t('analytics.avg')} ${formatAmount(avgTotal)}`,
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
            <span className="text-[10px] text-text-muted">{t('analytics.actual')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-warning opacity-60" style={{ borderTop: '1px dashed #FFB800' }} />
            <span className="text-[10px] text-text-muted">{t('analytics.forecastLabel')}</span>
          </div>
        </div>

        {monthsWithData < 2 && (
          <p className="text-center text-[11px] text-text-muted mt-2">
            {t('analytics.historyBuilding', { months: monthsWithData })}
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
  const { t } = useLanguage();

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
        name: cat
          ? (DEFAULT_CATEGORY_NAME_KEYS[cat.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[cat.id]) : cat.name)
          : t('analytics.other'),
        emoji: cat?.emoji || '📦',
        value: Math.round(value),
        color: cat?.color || '#8E8E93',
        pct: monthlyTotal > 0 ? Math.round((value / monthlyTotal) * 100) : 0,
      });
    }

    return result.sort((a, b) => b.value - a.value);
  }, [active, categories, displayCurrency, exchangeRate, monthlyTotal, t]);

  if (data.length === 0) return null;

  return (
    <div>
      <SectionHeader title={t('analytics.byCategory')} />
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
              <span className="text-[10px] text-text-muted">{symbol}{t('cycle.monthly')}</span>
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
  const { t } = useLanguage();

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
      <SectionHeader title={t('analytics.mostExpensive')} />
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
                    <p className="text-[10px] text-text-muted">{t('analytics.yearly')}</p>
                  )}
                </div>
                <span className="text-sm font-bold text-text-primary tabular-nums shrink-0">
                  {formatAmount(Math.round(monthly))} {symbol}{t('cycle.monthly')}
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
  const { t } = useLanguage();
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
        <span className="text-[10px] text-warning ml-1">{t('analytics.forecastTag')}</span>
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
