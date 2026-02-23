'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShareIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { DisplayCurrency } from '@/lib/types';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface SummaryCardsProps {
  totalMonthly: number;
  totalYearly: number;
  activeCount: number;
  upcomingSoonCount: number;
  currency: DisplayCurrency;
  onShare?: () => void;
  className?: string;
}

export function SummaryCards({
  totalMonthly,
  totalYearly,
  activeCount,
  upcomingSoonCount,
  currency,
  onShare,
  className,
}: SummaryCardsProps) {
  const { t } = useLanguage();
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
          {showYearly ? t('dashboard.perYear') : t('dashboard.perMonth')}
        </p>

        <p className="font-display font-extrabold text-[26px] leading-tight mt-1.5 text-neon neon-text">
          {formattedAmount}
          <span className="text-base font-bold ml-0.5">{symbol}</span>
        </p>

        <p className="text-text-muted text-[10px] mt-1">
          {showYearly
            ? `${Math.round(totalMonthly).toLocaleString('ru-RU')} ${symbol}${t('cycle.monthly')}`
            : `${Math.round(totalYearly).toLocaleString('ru-RU')} ${symbol}${t('cycle.yearly')}`}
        </p>

        {/* Share icon */}
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="absolute bottom-2 right-2 p-1.5 text-neon/40 active:text-neon transition-colors rounded-lg active:bg-neon/10"
          >
            <ShareIcon className="w-3.5 h-3.5" />
          </button>
        )}
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

        <p className="text-text-muted text-xs font-medium">{t('dashboard.active')}</p>

        <p className="font-display font-extrabold text-[26px] leading-tight mt-1.5 text-text-primary">
          {activeCount}
        </p>

        {upcomingSoonCount > 0 ? (
          <p className="text-warning text-[10px] mt-1 font-medium">
            {upcomingSoonCount} {t('dashboard.soonPayment')}
          </p>
        ) : (
          <p className="text-text-muted text-[10px] mt-1">
            {t('dashboard.allGood')}
          </p>
        )}
      </motion.div>
    </div>
  );
}
