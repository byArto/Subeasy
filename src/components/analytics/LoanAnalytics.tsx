'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Subscription, AppSettings, Currency } from '@/lib/types';
import { cn, convertCurrency, getThemeAccentColor } from '@/lib/utils';
import { resolveRates } from '@/lib/currency';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { obligationToLoanInput, type AppMode } from '@/lib/obligations';
import { summarizeLoan } from '@/lib/loanUtils';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';

interface LoanAnalyticsProps {
  obligations: Subscription[];
  settings: AppSettings;
  mode: AppMode;
  onSubTap?: (o: Subscription) => void;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

export function LoanAnalytics({ obligations, settings, mode }: LoanAnalyticsProps) {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const { displayCurrency } = settings;
  const rates = resolveRates(settings);
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  const cc = (v: number, from: Currency) => convertCurrency(v, from, displayCurrency as Currency, rates);

  const data = useMemo(() => {
    let totalDebt = 0;
    let totalMonthly = 0;
    let totalOverpay = 0;
    let payoff: string | null = null;
    const byLender = new Map<string, { value: number; color: string }>();

    for (const o of obligations) {
      const cur = o.currency as Currency;
      totalDebt += cc(o.outstandingBalance ?? 0, cur);
      totalMonthly += cc(o.price, cur);

      const lenderName = (o.lender ?? o.name) || (lang === 'en' ? 'Other' : 'Прочее');
      const prev = byLender.get(lenderName) ?? { value: 0, color: o.color };
      prev.value += cc(o.outstandingBalance ?? 0, cur);
      byLender.set(lenderName, prev);

      const li = obligationToLoanInput(o);
      if (li) {
        const s = summarizeLoan(li);
        totalOverpay += cc(s.totalInterest, cur);
        if (s.payoffDate && (!payoff || s.payoffDate > payoff)) payoff = s.payoffDate;
      }
    }

    const lenders = Array.from(byLender.entries())
      .map(([name, v]) => ({ name, value: v.value, color: v.color }))
      .sort((a, b) => b.value - a.value);

    // Доля «проценты vs тело» в оставшихся платежах
    const principalLeft = totalDebt;
    const interestLeft = totalOverpay;
    const totalLeft = principalLeft + interestLeft;
    const interestPct = totalLeft > 0 ? Math.round((interestLeft / totalLeft) * 100) : 0;

    return { totalDebt, totalMonthly, totalOverpay, payoff, lenders, interestPct, count: obligations.length };
  }, [obligations, displayCurrency, rates, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (obligations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-5 gap-3">
        <span className="text-5xl">{mode === 'mortgages' ? '🏦' : '💳'}</span>
        <p className="text-text-secondary text-sm font-medium">
          {lang === 'en' ? 'No data yet' : 'Пока нет данных'}
        </p>
      </div>
    );
  }

  const payoffStr = data.payoff
    ? new Date(data.payoff).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' })
    : '—';
  const maxLender = data.lenders[0]?.value || 1;

  return (
    <div className="space-y-6 px-5 pt-2 pb-4">
      {/* Hero: общий долг */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-surface-2 rounded-2xl border border-border-subtle p-5 text-center"
      >
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          {lang === 'en' ? 'Total debt' : 'Общий долг'}
        </p>
        <p className="font-display font-extrabold text-[40px] leading-none text-neon neon-text tabular-nums mt-2">
          {fmt(data.totalDebt)}<span className="text-2xl ml-1 opacity-70">{symbol}</span>
        </p>
        <p className="text-xs text-text-muted mt-2">
          {fmt(data.totalMonthly)} {symbol}{lang === 'en' ? '/mo' : '/мес'} · {lang === 'en' ? 'debt-free by' : 'закрытие'} {payoffStr}
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label={lang === 'en' ? 'Overpayment' : 'Переплата'} value={`${fmt(data.totalOverpay)} ${symbol}`} tone="warning" />
        <Stat label={lang === 'en' ? 'Monthly' : 'Платёж в месяц'} value={`${fmt(data.totalMonthly)} ${symbol}`} />
        <Stat label={lang === 'en' ? 'Debt-free by' : 'Полное закрытие'} value={payoffStr} />
        <Stat label={lang === 'en' ? (mode === 'mortgages' ? 'Mortgages' : 'Loans') : (mode === 'mortgages' ? 'Ипотек' : 'Кредитов')} value={String(data.count)} />
      </div>

      {/* Проценты vs тело */}
      {data.totalOverpay > 0 && (
        <div>
          <SectionHeader title={lang === 'en' ? 'Interest vs principal (remaining)' : 'Проценты и тело (остаток)'} />
          <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-surface-4">
              <div className="h-full bg-warning" style={{ width: `${data.interestPct}%` }} />
              <div className="h-full bg-neon" style={{ width: `${100 - data.interestPct}%` }} />
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-warning font-semibold">
                {lang === 'en' ? 'Interest' : 'Проценты'} {data.interestPct}% · {fmt(data.totalOverpay)} {symbol}
              </span>
              <span className="text-neon font-semibold">
                {lang === 'en' ? 'Principal' : 'Тело'} {100 - data.interestPct}% · {fmt(data.totalDebt)} {symbol}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* По банкам */}
      {data.lenders.length > 0 && (
        <div>
          <SectionHeader title={lang === 'en' ? 'By lender' : 'По банкам'} />
          <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-3">
            {data.lenders.map((l) => {
              const color = getThemeAccentColor(l.color, theme);
              const pct = Math.round((l.value / data.totalDebt) * 100);
              return (
                <div key={l.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-text-primary font-medium truncate">{l.name}</span>
                    <span className="text-text-secondary tabular-nums shrink-0 ml-2">
                      {fmt(l.value)} {symbol} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(l.value / maxLender) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="bg-surface-2 rounded-xl border border-border-subtle p-3">
      <p className="text-[11px] text-text-secondary mb-0.5">{label}</p>
      <p className={cn('text-[15px] font-bold tabular-nums', tone === 'warning' ? 'text-warning' : 'text-text-primary')}>
        {value}
      </p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2 pl-1">
      {title}
    </h3>
  );
}
