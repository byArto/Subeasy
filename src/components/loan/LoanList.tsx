'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Subscription } from '@/lib/types';
import type { AppMode } from '@/lib/obligations';
import { LoanCard } from './LoanCard';
import { Button } from '@/components/ui';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { obligationToLoanInput } from '@/lib/obligations';
import { summarizeLoan } from '@/lib/loanUtils';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface LoanListProps {
  obligations: Subscription[];
  mode: AppMode;
  onTap?: (o: Subscription) => void;
  onAddTap?: () => void;
}

export function LoanList({ obligations, mode, onTap, onAddTap }: LoanListProps) {
  const { lang, t } = useLanguage();

  const agg = useMemo(() => {
    const bySymbol: Record<string, { monthly: number; balance: number; overpay: number }> = {};
    let overallPayoff: string | null = null;
    for (const o of obligations) {
      const sym = CURRENCY_SYMBOLS[o.currency] || o.currency;
      if (!bySymbol[sym]) bySymbol[sym] = { monthly: 0, balance: 0, overpay: 0 };
      bySymbol[sym].monthly += o.price;
      bySymbol[sym].balance += o.outstandingBalance ?? 0;
      const li = obligationToLoanInput(o);
      if (li) {
        const s = summarizeLoan(li);
        bySymbol[sym].overpay += s.totalInterest;
        // Полное закрытие = самая поздняя дата среди всех обязательств (ISO YYYY-MM-DD сравнимы лексикографически)
        if (s.payoffDate && (!overallPayoff || s.payoffDate > overallPayoff)) overallPayoff = s.payoffDate;
      }
    }
    return { bySymbol, overallPayoff, currencyCount: Object.keys(bySymbol).length };
  }, [obligations]);

  const isMortgage = mode === 'mortgages';

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
      {/* Totals header — сколько всего должен (по валютам) */}
      {Object.entries(agg.bySymbol).map(([sym, val]) => (
        <div key={sym} className="flex items-center justify-between bg-surface-2 rounded-2xl px-4 py-3">
          <div>
            <p className="text-[11px] text-text-secondary mb-0.5">
              {lang === 'en' ? 'Total outstanding' : 'Общий остаток'}
            </p>
            <p className="text-[17px] font-bold text-text">
              {val.balance.toLocaleString('ru-RU')} {sym}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-text-secondary mb-0.5">
              {lang === 'en' ? 'Monthly payments' : 'В месяц'}
            </p>
            <p className="text-[17px] font-bold text-neon">
              {val.monthly.toLocaleString('ru-RU')} {sym}
            </p>
          </div>
        </div>
      ))}

      {/* Общая дата закрытия + переплата */}
      {agg.overallPayoff && (
        <div className="flex items-center justify-between bg-surface-2 rounded-2xl px-4 py-3">
          <div>
            <p className="text-[11px] text-text-secondary mb-0.5">
              {lang === 'en' ? 'Debt-free by' : 'Полное закрытие'}
            </p>
            <p className="text-[15px] font-bold text-text">
              {new Date(agg.overallPayoff).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          {agg.currencyCount === 1 && (
            <div className="text-right">
              <p className="text-[11px] text-text-secondary mb-0.5">
                {lang === 'en' ? 'Total overpayment' : 'Переплата'}
              </p>
              <p className="text-[15px] font-bold text-warning">
                {Math.round(Object.values(agg.bySymbol)[0].overpay).toLocaleString('ru-RU')} {Object.keys(agg.bySymbol)[0]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loan cards */}
      <AnimatePresence initial={false}>
        {obligations.map((o, i) => (
          <LoanCard key={o.id} obligation={o} index={i} onTap={onTap} />
        ))}
      </AnimatePresence>
    </div>
  );
}
