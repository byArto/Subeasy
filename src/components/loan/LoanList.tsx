'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Subscription } from '@/lib/types';
import type { AppMode } from '@/lib/obligations';
import { LoanCard } from './LoanCard';
import { Button } from '@/components/ui';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { obligationToLoanInput } from '@/lib/obligations';
import { summarizeLoan } from '@/lib/loanUtils';
import { cn, getDaysUntilPayment } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface LoanListProps {
  obligations: Subscription[];
  mode: AppMode;
  onTap?: (o: Subscription) => void;
  onAddTap?: () => void;
}

export function LoanList({ obligations, mode, onTap, onAddTap }: LoanListProps) {
  const { lang, t } = useLanguage();
  const [showOverpay, setShowOverpay] = useState(false);

  const agg = useMemo(() => {
    const bySymbol: Record<string, { monthly: number; balance: number; overpay: number }> = {};
    let overallPayoff: string | null = null;
    let upcomingCount = 0;
    for (const o of obligations) {
      const sym = CURRENCY_SYMBOLS[o.currency] || o.currency;
      if (!bySymbol[sym]) bySymbol[sym] = { monthly: 0, balance: 0, overpay: 0 };
      bySymbol[sym].monthly += o.price;
      bySymbol[sym].balance += o.outstandingBalance ?? 0;
      const d = getDaysUntilPayment(o.nextPaymentDate);
      if (d >= 0 && d <= 3) upcomingCount += 1;
      const li = obligationToLoanInput(o);
      if (li) {
        const s = summarizeLoan(li);
        bySymbol[sym].overpay += s.totalInterest;
        // Полное закрытие = самая поздняя дата среди всех обязательств (ISO YYYY-MM-DD сравнимы лексикографически)
        if (s.payoffDate && (!overallPayoff || s.payoffDate > overallPayoff)) overallPayoff = s.payoffDate;
      }
    }
    return { bySymbol, overallPayoff, upcomingCount, currencyCount: Object.keys(bySymbol).length };
  }, [obligations]);

  const isMortgage = mode === 'mortgages';
  const payoffShort = agg.overallPayoff
    ? new Date(agg.overallPayoff).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { month: 'short', year: 'numeric' })
    : null;

  if (obligations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
      >
        <span className="text-5xl">{isMortgage ? '🏦' : '💳'}</span>
        <p className="text-[17px] font-semibold text-text">
          {isMortgage
            ? (lang === 'en' ? 'No mortgages yet' : 'Ипотека не добавлена')
            : (lang === 'en' ? 'No credits yet' : 'Кредиты не добавлены')}
        </p>
        <p className="text-[13px] text-text-secondary max-w-[260px]">
          {isMortgage
            ? (lang === 'en' ? 'Add your mortgage to track payments and see the amortization schedule' : 'Добавьте ипотеку, чтобы следить за платежами и видеть график погашения')
            : (lang === 'en' ? 'Add your loans to track monthly payments and outstanding balance' : 'Добавьте кредиты, чтобы отслеживать ежемесячные платежи и остаток долга')}
        </p>
        {onAddTap && (
          <Button variant="primary" onClick={onAddTap}>
            {isMortgage
              ? (lang === 'en' ? '+ Add mortgage' : '+ Добавить ипотеку')
              : (lang === 'en' ? '+ Add credit' : '+ Добавить кредит')}
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5 pb-6">
      {/* Summary hero cards per currency: Остаток (тап → Переплата) + В месяц */}
      {Object.entries(agg.bySymbol).map(([sym, val]) => (
        <div key={sym} className="grid grid-cols-2 gap-3">
          {/* Left — Остаток / Переплата (tap to toggle) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowOverpay((v) => !v)}
            className="relative overflow-hidden rounded-2xl p-4 text-left bg-surface-2 border border-border-subtle"
          >
            <div className="absolute top-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-neon/0 via-neon/60 to-neon/0" />
            <p className="text-text-muted text-xs font-medium">
              {showOverpay
                ? (lang === 'en' ? 'Overpayment' : 'Переплата')
                : (lang === 'en' ? 'Total outstanding' : 'Общий остаток')}
            </p>
            <p className={cn(
              'font-display font-extrabold text-[24px] leading-tight mt-1.5 tabular-nums',
              showOverpay ? 'text-warning' : 'text-text-primary',
            )}>
              {Math.round(showOverpay ? val.overpay : val.balance).toLocaleString('ru-RU')}
              <span className="text-base font-bold ml-0.5">{sym}</span>
            </p>
            {payoffShort && (
              <p className="text-text-muted text-[10px] mt-1">
                {lang === 'en' ? 'debt-free by ' : 'закрытие '}{payoffShort}
              </p>
            )}
          </motion.button>

          {/* Right — В месяц */}
          <div className="relative overflow-hidden rounded-2xl p-4 bg-surface-2 border border-border-subtle">
            <div className="absolute top-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-neon/0 via-neon/60 to-neon/0" />
            <p className="text-text-muted text-xs font-medium">{lang === 'en' ? 'Monthly' : 'В месяц'}</p>
            <p className="font-display font-extrabold text-[24px] leading-tight mt-1.5 text-neon neon-text tabular-nums">
              {Math.round(val.monthly).toLocaleString('ru-RU')}
              <span className="text-base font-bold ml-0.5">{sym}</span>
            </p>
            {agg.upcomingCount > 0 ? (
              <p className="text-warning text-[10px] mt-1 font-medium">
                {agg.upcomingCount} {t('dashboard.soonPayment')}
              </p>
            ) : (
              <p className="text-text-muted text-[10px] mt-1">{t('dashboard.allGood')}</p>
            )}
          </div>
        </div>
      ))}

      {/* Loan cards */}
      <AnimatePresence initial={false}>
        {obligations.map((o, i) => (
          <LoanCard key={o.id} obligation={o} index={i} onTap={onTap} />
        ))}
      </AnimatePresence>
    </div>
  );
}
