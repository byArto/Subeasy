'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DisplayCurrency } from '@/lib/types';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface SummaryCardsProps {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  upcomingSoonCount: number;
  currency: DisplayCurrency;
  className?: string;
}

export function SummaryCards({
  totalMonthly,
  totalYearly,
  activeCount,
  upcomingSoonCount,
  currency,
  className,
}: SummaryCardsProps) {
  const [showYearly, setShowYearly] = useState(false);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const displayAmount = showYearly ? totalYearly : totalMonthly;
  const formattedAmount = Math.round(displayAmount).toLocaleString('ru-RU');

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {/* Left — Total cost */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 30 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowYearly((p) => !p)}
        className={cn(
          'relative overflow-hidden rounded-2xl p-4 text-left',
          'bg-surface-2 border border-border-subtle'
        )}
      >
        {/* Neon accent line top */}
        <div className="absolute top-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-neon/0 via-neon/60 to-neon/0" />

        <p className="text-text-muted text-xs font-medium">
          {showYearly ? 'В год' : 'В месяц'}
        </p>

        <p className="font-display font-extrabold text-[26px] leading-tight mt-1.5 text-neon neon-text">
          {formattedAmount}
          <span className="text-base font-bold ml-0.5">{symbol}</span>
        </p>

        <p className="text-text-muted text-[10px] mt-1">
          {showYearly
            ? `${Math.round(totalMonthly).toLocaleString('ru-RU')} ${symbol}/мес`
            : `${Math.round(totalYearly).toLocaleString('ru-RU')} ${symbol}/год`}
        </p>
      </motion.button>

      {/* Right — Active count */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'relative overflow-hidden rounded-2xl p-4',
          'bg-surface-2 border border-border-subtle'
        )}
      >
        {/* Subtle accent line */}
        <div className="absolute top-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-surface-4/0 via-surface-4 to-surface-4/0" />

        <p className="text-text-muted text-xs font-medium">Активные</p>

        <p className="font-display font-extrabold text-[26px] leading-tight mt-1.5 text-text-primary">
          {activeCount}
        </p>

        {upcomingSoonCount > 0 ? (
          <p className="text-warning text-[10px] mt-1 font-medium">
            {upcomingSoonCount} скоро оплата
          </p>
        ) : (
          <p className="text-text-muted text-[10px] mt-1">
            Всё под контролем
          </p>
        )}
      </motion.div>
    </div>
  );
}
