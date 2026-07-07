'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Subscription, Category, AppSettings, Currency } from '@/lib/types';
import { getMonthlyPrice, convertCurrency, cn, getThemeAccentColor } from '@/lib/utils';
import { resolveRates } from '@/lib/currency';
import { CURRENCY_SYMBOLS, DEFAULT_CATEGORY_NAME_KEYS } from '@/lib/constants';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { findDuplicates, getIgnoredPairs, isGroupIgnored } from '@/lib/duplicates';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { usePro } from '@/components/providers/ProProvider';
import { useTheme } from '@/components/providers/ThemeProvider';

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
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

/* ── Helpers ── */

type Period = 'month' | 'quarter' | 'year';
const PERIOD_MULTIPLIER: Record<Period, number> = { month: 1, quarter: 3, year: 12 };

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function getMonthlyInCurrency(sub: Subscription, currency: string, rates: Record<Currency, number>): number {
  const monthly = getMonthlyPrice(sub);
  return convertCurrency(monthly, sub.currency as Currency, currency as Currency, rates);
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
  rates: Record<Currency, number>,
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
      return total + convertCurrency(monthly, sub.currency as Currency, displayCurrency as Currency, rates);
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
  const { displayCurrency } = settings;
  const rates = resolveRates(settings);
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  const altCurrency = displayCurrency === 'RUB' ? 'USD' : 'RUB';
  const altSymbol = CURRENCY_SYMBOLS[altCurrency];

  const active = useMemo(() => subscriptions.filter((s) => s.isActive), [subscriptions]);

  const monthlyTotal = useMemo(
    () => active.reduce((sum, s) => sum + getMonthlyInCurrency(s, displayCurrency, rates), 0),
    [active, displayCurrency, rates],
  );

  const monthlyTotalAlt = useMemo(
    () => active.reduce((sum, s) => sum + getMonthlyInCurrency(s, altCurrency, rates), 0),
    [active, altCurrency, rates],
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

  return (
    <div className="space-y-6 px-5 pt-2 pb-4">
      <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <PeriodTotal
          monthlyTotal={monthlyTotal}
          monthlyTotalAlt={monthlyTotalAlt}
          symbol={symbol}
          altSymbol={altSymbol}
          subscriptions={subscriptions}
          displayCurrency={displayCurrency}
          rates={rates}
        />
      </motion.div>

      <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <BudgetSection
          monthlyTotal={monthlyTotal}
          settings={settings}
          symbol={symbol}
          onOpenPro={onOpenPro}
          onUpdateSettings={onUpdateSettings}
          categories={categories}
          active={active}
          displayCurrency={displayCurrency}
          rates={rates}
        />
      </motion.div>

      <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <CategoryBreakdown
          active={active}
          categories={categories}
          displayCurrency={displayCurrency}
          rates={rates}
          symbol={symbol}
          monthlyTotal={monthlyTotal}
          onSubTap={onSubTap}
        />
      </motion.div>

      <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <TopExpensive
          active={active}
          displayCurrency={displayCurrency}
          rates={rates}
          symbol={symbol}
          monthlyTotal={monthlyTotal}
          onSubTap={onSubTap}
        />
      </motion.div>

      <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <InsightsBadges
          active={active}
          subscriptions={subscriptions}
          displayCurrency={displayCurrency}
          rates={rates}
          monthlyTotal={monthlyTotal}
          onSubTap={onSubTap}
        />
      </motion.div>

      <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
        <SubScoreSection
          subscriptions={subscriptions}
          active={active}
          settings={settings}
          monthlyTotal={monthlyTotal}
          displayCurrency={displayCurrency}
          rates={rates}
          onOpenPro={onOpenPro}
        />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ PRO: Бюджетный лимит
   ═══════════════════════════════════════ */

interface CategorySpend {
  id: string;
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
  rates,
}: {
  monthlyTotal: number;
  settings: AppSettings;
  symbol: string;
  onOpenPro?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  categories: Category[];
  active: Subscription[];
  displayCurrency: string;
  rates: Record<Currency, number>;
}) {
  const { t } = useLanguage();
  const { isPro, loading } = usePro();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const rawBudget = settings.monthlyBudget ?? 0;
  const budgetCur = settings.budgetCurrency ?? displayCurrency;
  // Convert stored budget to current display currency
  const budget = rawBudget > 0 && budgetCur !== displayCurrency
    ? Math.round(convertCurrency(rawBudget, budgetCur as Currency, displayCurrency as Currency, rates))
    : rawBudget;
  const pct = budget > 0 ? Math.min((monthlyTotal / budget) * 100, 999) : 0;
  const remaining = budget - monthlyTotal;
  const isOver = remaining < 0;

  const barColor =
    pct >= 100 ? '#FF4444' :
    pct >= 90  ? '#FF6B00' :
    pct >= 70  ? '#FFB800' :
    'var(--color-success)';

  const topCategories = useMemo<CategorySpend[]>(() => {
    if (active.length === 0) return [];
    const map = new Map<string, number>();
    for (const s of active) {
      const monthly = getMonthlyInCurrency(s, displayCurrency, rates);
      map.set(s.category, (map.get(s.category) || 0) + monthly);
    }
    const result: CategorySpend[] = [];
    for (const [catId, value] of map) {
      const cat = categories.find((c) => c.id === catId);
      result.push({
        id: catId,
        name: cat ? (DEFAULT_CATEGORY_NAME_KEYS[cat.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[cat.id]) : cat.name) : t('analytics.other'),
        emoji: cat?.emoji || '📦',
        color: cat?.color || '#8E8E93',
        value: Math.round(value),
        pct: monthlyTotal > 0 ? Math.round((value / monthlyTotal) * 100) : 0,
      });
    }
    return result.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [active, categories, displayCurrency, rates, monthlyTotal, t]);

  useEffect(() => {
    if (editing) {
      setInputVal(budget > 0 ? String(budget) : '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing, budget]);

  const handleSave = () => {
    const val = parseFloat(inputVal.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      onUpdateSettings?.({ monthlyBudget: Math.round(val), budgetCurrency: displayCurrency as import('@/lib/types').DisplayCurrency });
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
                <CategoryIcon id={cat.id} color={cat.color} emoji={cat.emoji} size={15} variant="line" className="shrink-0" />
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
  subscriptions,
  displayCurrency,
  rates,
}: {
  monthlyTotal: number;
  monthlyTotalAlt: number;
  symbol: string;
  altSymbol: string;
  subscriptions: Subscription[];
  displayCurrency: string;
  rates: Record<Currency, number>;
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

  // Month-over-month % change (only shown in "month" period)
  const { pct, isUp, isNewPeriod } = useMemo(() => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();
    const prevM = curM === 0 ? 11 : curM - 1;
    const prevY = curM === 0 ? curY - 1 : curY;
    const thisTotal = getMonthlyTotal(subscriptions, curY, curM, rates, displayCurrency);
    const lastTotal = getMonthlyTotal(subscriptions, prevY, prevM, rates, displayCurrency);
    const diff = thisTotal - lastTotal;
    return {
      pct: lastTotal > 0 ? Math.round((diff / lastTotal) * 100) : null,
      isUp: diff > 0,
      isNewPeriod: lastTotal === 0 && thisTotal > 0,
    };
  }, [subscriptions, rates, displayCurrency]);

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
            {/* Month comparison chip */}
            {period === 'month' && (
              <div className="flex justify-center mt-3">
                {isNewPeriod ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neon/15 text-neon">
                    NEW
                  </span>
                ) : pct !== null ? (
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-semibold',
                    isUp ? 'bg-danger/15 text-danger' : pct < 0 ? 'bg-neon/15 text-neon' : 'bg-surface-3 text-text-muted',
                  )}>
                    {isUp ? '↑ +' : pct < 0 ? '↓ ' : '= '}{pct}% {t('analytics.vsLastMonth')}
                  </span>
                ) : null}
              </div>
            )}
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
  rates,
  monthlyTotal,
  onSubTap,
}: {
  active: Subscription[];
  subscriptions: Subscription[];
  displayCurrency: string;
  rates: Record<Currency, number>;
  monthlyTotal: number;
  onSubTap?: (sub: Subscription) => void;
}) {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const dominant = useMemo(() => {
    if (active.length === 0 || monthlyTotal <= 0) return null;
    let best: Subscription | null = null;
    let bestMonthly = 0;
    for (const s of active) {
      const m = getMonthlyInCurrency(s, displayCurrency, rates);
      if (m > bestMonthly) { bestMonthly = m; best = s; }
    }
    if (!best) return null;
    const pct = Math.round((bestMonthly / monthlyTotal) * 100);
    return { sub: best, monthly: bestMonthly, pct };
  }, [active, displayCurrency, rates, monthlyTotal]);

  const longest = useMemo(() => {
    const allActive = subscriptions.filter((s) => s.isActive && s.cycle !== 'one-time' && s.cycle !== 'trial');
    if (allActive.length === 0) return null;
    let best: Subscription | null = null;
    let bestDays = 0;
    for (const s of allActive) {
      const d = daysSince(s.startDate);
      if (d > bestDays) { bestDays = d; best = s; }
    }
    return best ? { sub: best, days: bestDays } : null;
  }, [subscriptions]);

  if (!dominant && !longest) return null;

  const dominantColor = dominant ? getThemeAccentColor(dominant.sub.color, theme) : '';
  const longestColor = longest ? getThemeAccentColor(longest.sub.color, theme) : '';

  return (
    <div>
      <SectionHeader title={t('analytics.insights')} />
      <div className="grid grid-cols-2 gap-3">
        {/* Dominant */}
        {dominant && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSubTap?.(dominant.sub)}
            className="relative bg-surface-2 rounded-2xl border border-border-subtle p-4 overflow-hidden text-left active:bg-surface-3 transition-colors"
          >
            <div
              className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: dominantColor }}
            />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs">📊</span>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  {t('analytics.dominant')}
                </span>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2.5"
                style={{ background: `linear-gradient(135deg, ${dominantColor}30, ${dominantColor}10)` }}
              >
                <ServiceLogo name={dominant.sub.name} emoji={dominant.sub.icon} size={24} />
              </div>
              <p className="text-sm font-semibold text-text-primary truncate">{dominant.sub.name}</p>
              <p className="text-lg font-bold tabular-nums mt-1" style={{ color: dominantColor }}>
                {dominant.pct}%
                <span className="text-xs text-text-muted ml-1 font-normal">{t('analytics.ofExpenses')}</span>
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
              style={{ backgroundColor: longestColor }}
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
                  background: `linear-gradient(135deg, ${longestColor}30, ${longestColor}10)`,
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
   СЕКЦИЯ 6: Круговая диаграмма
   ═══════════════════════════════════════ */

interface CategoryData {
  id: string;
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
  rates,
  symbol,
  monthlyTotal,
  onSubTap,
}: {
  active: Subscription[];
  categories: Category[];
  displayCurrency: string;
  rates: Record<Currency, number>;
  symbol: string;
  monthlyTotal: number;
  onSubTap?: (sub: Subscription) => void;
}) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of active) {
      const monthly = getMonthlyInCurrency(s, displayCurrency, rates);
      map.set(s.category, (map.get(s.category) || 0) + monthly);
    }

    const result: CategoryData[] = [];
    for (const [catId, value] of map) {
      const cat = categories.find((c) => c.id === catId);
      result.push({
        id: catId,
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
  }, [active, categories, displayCurrency, rates, monthlyTotal, t]);

  const selectedData = selectedId ? data.find((d) => d.id === selectedId) ?? null : null;
  const selectedSubs = useMemo(
    () => selectedId ? active.filter((s) => s.category === selectedId) : [],
    [active, selectedId],
  );

  const toggle = (id: string) => setSelectedId((prev) => (prev === id ? null : id));

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
                  strokeWidth={2}
                  stroke="transparent"
                  animationBegin={0}
                  animationDuration={600}
                  onClick={(_, index) => toggle(data[index].id)}
                  style={{ cursor: 'pointer' }}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={selectedId && selectedId !== entry.id ? 0.25 : 1}
                      // @ts-expect-error recharts supports outerRadius on Cell
                      outerRadius={selectedId === entry.id ? '92%' : '85%'}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                {selectedData ? (
                  <motion.div
                    key={selectedData.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center"
                  >
                    <CategoryIcon id={selectedData.id} color={selectedData.color} emoji={selectedData.emoji} size={30} />
                    <span className="text-[11px] font-semibold text-text-primary mt-0.5 text-center leading-tight px-2">
                      {selectedData.name}
                    </span>
                    <span className="text-xs font-bold tabular-nums mt-0.5" style={{ color: selectedData.color }}>
                      {formatAmount(selectedData.value)} {symbol}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="total"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-lg font-bold text-text-primary tabular-nums">
                      {formatAmount(Math.round(monthlyTotal))}
                    </span>
                    <span className="text-[10px] text-text-muted">{symbol}{t('cycle.monthly')}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5">
          {data.map((d) => {
            const isSelected = selectedId === d.id;
            const isDimmed = selectedId !== null && !isSelected;
            return (
              <motion.button
                key={d.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(d.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors',
                  isSelected ? 'bg-surface-3' : isDimmed ? 'opacity-40' : 'active:bg-surface-3',
                )}
              >
                <span
                  className={cn('w-2.5 h-2.5 rounded-full shrink-0 transition-transform', isSelected && 'scale-125')}
                  style={{ backgroundColor: d.color }}
                />
                <CategoryIcon id={d.id} color={d.color} emoji={d.emoji} size={16} variant="line" className="shrink-0" />
                <span className="text-sm text-text-primary flex-1 truncate text-left">{d.name}</span>
                <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
                  {formatAmount(d.value)} {symbol}
                </span>
                <span className="text-[11px] text-text-muted w-8 text-right tabular-nums shrink-0">
                  {d.pct}%
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Subscriptions for selected category */}
        <AnimatePresence>
          {selectedData && selectedSubs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border-subtle space-y-2">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2 pl-1">
                  {selectedData.emoji} {selectedData.name}
                </p>
                {selectedSubs.map((sub) => {
                  const monthly = Math.round(getMonthlyInCurrency(sub, displayCurrency, rates));
                  return (
                    <motion.button
                      key={sub.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSubTap?.(sub)}
                      className="w-full flex items-center gap-3 rounded-xl p-2.5 bg-surface-3 active:bg-surface-4 transition-colors"
                    >
                      <ServiceLogo name={sub.name} emoji={sub.icon} size={32} className="rounded-lg shrink-0" />
                      <span className="text-sm text-text-primary flex-1 text-left truncate">{sub.name}</span>
                      <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: selectedData.color }}>
                        {formatAmount(monthly)} {symbol}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   СЕКЦИЯ 7: Топ-3 самых дорогих
   ═══════════════════════════════════════ */

const MEDAL_COLORS = ['#E3A93A', '#A6AEB8', '#C1793F'];

function TopExpensive({
  active,
  displayCurrency,
  rates,
  symbol,
  monthlyTotal,
  onSubTap,
}: {
  active: Subscription[];
  displayCurrency: string;
  rates: Record<Currency, number>;
  symbol: string;
  monthlyTotal: number;
  onSubTap?: (sub: Subscription) => void;
}) {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const top3 = useMemo(() => {
    return active
      .map((s) => ({
        sub: s,
        monthly: getMonthlyInCurrency(s, displayCurrency, rates),
      }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 3);
  }, [active, displayCurrency, rates]);

  if (top3.length === 0) return null;

  return (
    <div>
      <SectionHeader title={t('analytics.mostExpensive')} />
      <div className="space-y-2.5">
        {top3.map(({ sub, monthly }, i) => {
          const pct = monthlyTotal > 0 ? (monthly / monthlyTotal) * 100 : 0;
          const isYearly = sub.cycle === 'yearly';
          const accentColor = getThemeAccentColor(sub.color, theme);

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
                <AppIcon name="medal" color={MEDAL_COLORS[i]} size={26} />
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
                    backgroundColor: accentColor,
                    boxShadow: i === 0 ? `0 0 8px ${accentColor}60` : undefined,
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

/* ═══════════════════════════════════════
   СЕКЦИЯ PRO: Sub Score (A–F Grade)
   ═══════════════════════════════════════ */

const GRADE_COLORS: Record<string, string> = {
  A: 'var(--color-success)',
  B: '#82D200',
  C: '#FFB800',
  D: '#FF8C00',
  F: '#FF4444',
};

interface ScoreFactor {
  icon: string;
  iconName: AppIconName;
  iconColor: string;
  nameKey: string;
  descKey: string;
  descVars?: Record<string, string | number>;
  tipKey: string;
  tipVars?: Record<string, string | number>;
  pts: number;
  maxPts: number;
}

function calcSubScore(
  subscriptions: Subscription[],
  active: Subscription[],
  settings: AppSettings,
  monthlyTotal: number,
  displayCurrency: string,
  rates: Record<Currency, number>,
): { total: number; grade: string; statusKey: string; factors: ScoreFactor[]; worstFactor: ScoreFactor | null } {
  const factors: ScoreFactor[] = [];

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // ── Factor 1: Budget (25 pts) — gentler floors; not setting a limit is only a
  //    small ding, and going over budget never drops below 8 pts. ──
  const budget = settings.monthlyBudget ?? 0;
  let bPts: number; let bDesc: string; let bDescVars: Record<string, string | number> | undefined;
  let bTip: string; let bTipVars: Record<string, string | number> | undefined;
  if (budget <= 0) {
    bPts = 20; bDesc = 'score.factorBudgetNoLimit'; bTip = 'score.tipBudget';
  } else {
    const pct = (monthlyTotal / budget) * 100;
    if (pct <= 80) {
      bPts = 25; bDesc = 'score.factorBudgetGood'; bDescVars = { pct: Math.round(pct) }; bTip = 'score.tipBudget';
    } else if (pct <= 100) {
      bPts = Math.round(20 + ((100 - pct) / 20) * 5);
      bDesc = 'score.factorBudgetWarn'; bDescVars = { pct: Math.round(pct) }; bTip = 'score.tipBudgetOver';
    } else {
      const over = Math.round(pct - 100);
      bPts = Math.max(8, Math.round(20 - over * 0.5));
      bDesc = 'score.factorBudgetOver'; bDescVars = { pct: over };
      bTip = 'score.tipBudgetOver'; bTipVars = { pct: over };
    }
  }
  factors.push({ icon: '💰', iconName: 'budget', iconColor: '#2FB86B', nameKey: 'score.factorBudget', descKey: bDesc, descVars: bDescVars, tipKey: bTip, tipVars: bTipVars, pts: bPts, maxPts: 25 });

  // ── Factor 2: No unused subs (20 pts) — softer −5 per inactive sub. ──
  const inactive = subscriptions.filter((s) => !s.isActive);
  const aPts = Math.max(0, 20 - inactive.length * 5);
  factors.push({
    icon: '😴', iconName: 'inactive', iconColor: '#7C8AA5', nameKey: 'score.factorActive',
    descKey: inactive.length === 0 ? 'score.factorActiveGood' : 'score.factorActiveBad',
    descVars: inactive.length > 0 ? { n: inactive.length } : undefined,
    tipKey: 'score.tipActive', tipVars: inactive.length > 0 ? { n: inactive.length } : undefined,
    pts: aPts, maxPts: 20,
  });

  // ── Factor 3: No duplicates (15 pts) — ONLY true same-service duplicates (same
  //    name), and duplicates the user has explicitly marked "intentional" are not
  //    counted. Two different services in one category are no longer flagged. ──
  const ignoredPairs = getIgnoredPairs();
  const dupeGroups = findDuplicates(active).filter((g) => !isGroupIgnored(g, ignoredPairs));
  const dupeCount = dupeGroups.length;
  const dPts = Math.max(0, 15 - dupeCount * 7);
  factors.push({
    icon: '🔄', iconName: 'duplicates', iconColor: '#8B5CF6', nameKey: 'score.factorDupes',
    descKey: dupeCount === 0 ? 'score.factorDupesGood' : 'score.factorDupesBad',
    descVars: dupeCount > 0 ? { n: dupeCount } : undefined,
    tipKey: 'score.tipDupes',
    pts: dPts, maxPts: 15,
  });

  // ── Factor 4: Diversification (15 pts) — one sub is fully "diversified". ──
  let divPts: number; let divDesc: string; let divDescVars: Record<string, string | number> | undefined;
  if (active.length <= 1) {
    divPts = 15; divDesc = 'score.factorDiversifyGood';
  } else {
    const catSpend = new Map<string, number>();
    for (const s of active) {
      const m = getMonthlyInCurrency(s, displayCurrency, rates);
      catSpend.set(s.category, (catSpend.get(s.category) || 0) + m);
    }
    const topPct = monthlyTotal > 0
      ? (Array.from(catSpend.values()).sort((a, b) => b - a)[0] / monthlyTotal) * 100
      : 0;
    if (topPct <= 40) {
      divPts = 15; divDesc = 'score.factorDiversifyGood';
    } else if (topPct <= 60) {
      divPts = 10; divDesc = 'score.factorDiversifyBad'; divDescVars = { pct: Math.round(topPct) };
    } else {
      divPts = 6; divDesc = 'score.factorDiversifyBad'; divDescVars = { pct: Math.round(topPct) };
    }
  }
  factors.push({
    icon: '📊', iconName: 'diversify', iconColor: '#3B82F6', nameKey: 'score.factorDiversify',
    descKey: divDesc, descVars: divDescVars,
    tipKey: 'score.tipDiversify',
    pts: divPts, maxPts: 15,
  });

  // ── Factor 5: Trials under control (15 pts) — tracking a trial is GOOD, not a
  //    penalty. Only a trial about to convert (≤5 days, or already due) costs a
  //    few points, because that's the actual "you're about to be charged" risk. ──
  const trials = active.filter((s) => s.cycle === 'trial');
  const soonTrials = trials.filter((s) => {
    const due = new Date(s.nextPaymentDate).getTime();
    return !Number.isNaN(due) && (due - now.getTime()) / DAY_MS <= 5;
  });
  let tPts: number; let tDesc: string; let tDescVars: Record<string, string | number> | undefined;
  if (trials.length === 0) {
    tPts = 15; tDesc = 'score.factorTrialsGood';
  } else if (soonTrials.length === 0) {
    tPts = 15; tDesc = 'score.factorTrialsTracked'; tDescVars = { n: trials.length };
  } else {
    tPts = Math.max(5, 15 - soonTrials.length * 5);
    tDesc = 'score.factorTrialsBad'; tDescVars = { n: soonTrials.length };
  }
  factors.push({
    icon: '🧪', iconName: 'trials', iconColor: '#14B8A6', nameKey: 'score.factorTrials',
    descKey: tDesc, descVars: tDescVars,
    tipKey: 'score.tipTrials',
    pts: tPts, maxPts: 15,
  });

  // ── Factor 6: Annual plans (10 pts) — a gentle nudge, never a hard zero. ──
  const annuals = active.filter((s) => s.cycle === 'yearly');
  const anPts = annuals.length > 0 ? 10 : 7;
  factors.push({
    icon: '📅', iconName: 'annual', iconColor: '#F59E0B', nameKey: 'score.factorAnnual',
    descKey: annuals.length > 0 ? 'score.factorAnnualGood' : 'score.factorAnnualNone',
    tipKey: 'score.tipAnnual',
    pts: anPts, maxPts: 10,
  });

  const total = factors.reduce((sum, f) => sum + f.pts, 0);
  let grade: string; let statusKey: string;
  if (total >= 90) { grade = 'A'; statusKey = 'score.gradeExcellent'; }
  else if (total >= 75) { grade = 'B'; statusKey = 'score.gradeGood'; }
  else if (total >= 60) { grade = 'C'; statusKey = 'score.gradeOk'; }
  else if (total >= 45) { grade = 'D'; statusKey = 'score.gradeWarn'; }
  else { grade = 'F'; statusKey = 'score.gradeBad'; }

  const worstFactor = factors
    .filter((f) => f.pts < f.maxPts)
    .sort((a, b) => (a.pts / a.maxPts) - (b.pts / b.maxPts))[0] || null;

  return { total, grade, statusKey, factors, worstFactor };
}

function SubScoreSection({
  subscriptions,
  active,
  settings,
  monthlyTotal,
  displayCurrency,
  rates,
  onOpenPro,
}: {
  subscriptions: Subscription[];
  active: Subscription[];
  settings: AppSettings;
  monthlyTotal: number;
  displayCurrency: string;
  rates: Record<Currency, number>;
  onOpenPro?: () => void;
}) {
  const { isPro, loading } = usePro();
  const { t } = useLanguage();

  if (loading) return null;

  // ── Non-PRO locked card ──
  if (!isPro) {
    return (
      <div>
        <SectionHeader title={t('score.title')} />
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
              <p className="text-sm font-semibold text-text-primary">{t('score.proLocked.title')}</p>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t('score.proLocked.desc')}</p>
            </div>
            <div className="px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.3)' }}>
              <span className="text-[10px] font-bold tracking-wider" style={{ color: '#f5c842' }}>PRO</span>
            </div>
          </div>
        </motion.button>
      </div>
    );
  }

  // ── Not enough subscriptions ──
  if (active.length < 4) {
    return (
      <div>
        <SectionHeader title={t('score.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0">
              <span className="text-lg">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t('score.notEnough')}</p>
              <p className="text-xs text-text-muted mt-0.5">{t('score.notEnoughDesc', { n: active.length })}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { total, grade, statusKey, factors, worstFactor } = calcSubScore(
    subscriptions, active, settings, monthlyTotal, displayCurrency, rates,
  );
  const gradeColor = GRADE_COLORS[grade] || '#8888A0';
  const GRADES = ['F', 'D', 'C', 'B', 'A'];

  return (
    <div>
      <SectionHeader title={t('score.title')} />
      <div className="bg-surface-2 rounded-2xl border border-border-subtle overflow-hidden">

        {/* Hero */}
        <div className="p-4 flex items-center justify-between border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Sub Score</p>
              <div className="px-2 py-0.5 rounded-lg" style={{ background: 'rgba(245,200,66,0.12)', border: '1px solid rgba(245,200,66,0.3)' }}>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#f5c842' }}>PRO</span>
              </div>
            </div>
            <p className="text-xl font-bold text-text-primary">{t(statusKey)}</p>
            <p className="text-xs text-text-muted mt-0.5">
              <AnimatedNumber value={total} format={(n) => Math.round(n).toString()} /> / 100 {t('score.pts')}
            </p>
          </div>
          {/* Ring gauge — shows the actual score, grade letter centered */}
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-text-muted/20" />
              <motion.circle
                cx="18" cy="18" r="15.5" fill="none" stroke={gradeColor} strokeWidth="3" strokeLinecap="round"
                strokeDasharray="97.4"
                initial={{ strokeDashoffset: 97.4 }}
                animate={{ strokeDashoffset: 97.4 - (total / 100) * 97.4 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-2xl font-black" style={{ color: gradeColor }}>{grade}</span>
            </div>
          </div>
        </div>

        {/* Grade scale */}
        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">{t('score.scale')}</p>
          <div className="flex gap-1.5">
            {GRADES.map((g) => {
              const isActive = g === grade;
              const col = GRADE_COLORS[g];
              return (
                <div
                  key={g}
                  className={`flex-1 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${isActive ? '' : 'bg-surface-3 text-text-muted/50'}`}
                  style={isActive ? { background: `${col}18`, border: `1px solid ${col}50`, color: col } : undefined}
                >
                  {g}
                </div>
              );
            })}
          </div>
        </div>

        {/* Factors */}
        <div className="divide-y divide-border-subtle">
          {factors.map((f, i) => {
            const ratio = f.pts / f.maxPts;
            const fColor = ratio >= 0.8 ? 'var(--color-success)' : ratio >= 0.5 ? '#FFB800' : '#FF4444';
            return (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <AppIcon name={f.iconName} color={f.iconColor} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary">{t(f.nameKey)}</p>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{t(f.descKey, f.descVars)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-bold tabular-nums" style={{ color: fColor }}>{f.pts}</span>
                  <div className="w-10 h-1 rounded-full overflow-hidden bg-surface-4">
                    <div className="h-full rounded-full" style={{ width: `${(f.pts / f.maxPts) * 100}%`, background: fColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip: how to improve */}
        {worstFactor && (
          <div className="px-4 py-3 border-t border-border-subtle flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base mt-0.5" style={{ background: 'rgba(255,184,0,0.1)' }}>
              💡
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#FFB800' }}>{t('score.howToImprove')}</p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{t(worstFactor.tipKey, worstFactor.tipVars)}</p>
            </div>
          </div>
        )}
      </div>
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
