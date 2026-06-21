'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Subscription, AppSettings, Currency } from '@/lib/types';
import { SummaryCards } from './SummaryCards';
import { SubCard } from '@/components/subscription/SubCard';
import { LoanCard } from '@/components/loan/LoanCard';
import { getKind } from '@/lib/obligations';
import { convertCurrency, getMonthlyPrice, getDaysUntilPayment } from '@/lib/utils';
import { resolveRates } from '@/lib/currency';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface AllOverviewProps {
  obligations: Subscription[];
  settings: AppSettings;
  onTap?: (o: Subscription) => void;
  onShare?: () => void;
}

type GroupKey = 'subscription' | 'credit' | 'mortgage';

const GROUP_META: Record<GroupKey, { icon: string; ru: string; en: string }> = {
  subscription: { icon: '🔁', ru: 'Подписки', en: 'Subscriptions' },
  credit: { icon: '💳', ru: 'Кредиты', en: 'Credits' },
  mortgage: { icon: '🏦', ru: 'Ипотека', en: 'Mortgage' },
};

export function AllOverview({ obligations, settings, onTap, onShare }: AllOverviewProps) {
  const { lang, t } = useLanguage();
  const { displayCurrency } = settings;
  const rates = resolveRates(settings);
  const symbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  const { totalMonthly, activeCount, upcomingCount, groups } = useMemo(() => {
    const active = obligations.filter((o) => o.isActive);
    let monthly = 0;
    let upcoming = 0;
    const g: Record<GroupKey, { items: Subscription[]; subtotal: number }> = {
      subscription: { items: [], subtotal: 0 },
      credit: { items: [], subtotal: 0 },
      mortgage: { items: [], subtotal: 0 },
    };
    for (const o of obligations) {
      const key = getKind(o) as GroupKey;
      g[key].items.push(o);
      if (o.isActive) {
        const m = convertCurrency(getMonthlyPrice(o), o.currency as Currency, displayCurrency as Currency, rates);
        monthly += m;
        g[key].subtotal += m;
        const d = getDaysUntilPayment(o.nextPaymentDate);
        if (d >= 0 && d <= 3) upcoming += 1;
      }
    }
    return { totalMonthly: monthly, activeCount: active.length, upcomingCount: upcoming, groups: g };
  }, [obligations, displayCurrency, rates]);

  const order: GroupKey[] = ['subscription', 'credit', 'mortgage'];

  return (
    <div className="space-y-5 px-5 pt-2 pb-6">
      <SummaryCards
        totalMonthly={totalMonthly}
        totalYearly={totalMonthly * 12}
        activeCount={activeCount}
        upcomingSoonCount={upcomingCount}
        currency={displayCurrency}
        onShare={onShare}
      />

      {order.map((key) => {
        const group = groups[key];
        if (group.items.length === 0) return null;
        const meta = GROUP_META[key];
        return (
          <div key={key} className="space-y-2.5">
            {/* Group header with subtotal */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                {meta.icon} {lang === 'en' ? meta.en : meta.ru} · {group.items.length}
              </span>
              <span className="text-[12px] font-bold text-text-secondary tabular-nums">
                {Math.round(group.subtotal).toLocaleString('ru-RU')} {symbol}{t('cycle.monthly')}
              </span>
            </div>

            {/* Cards — SubCard for subscriptions, LoanCard for loans */}
            <motion.div initial={false} className="space-y-2.5">
              {group.items.map((o, i) =>
                key === 'subscription' ? (
                  <SubCard key={o.id} subscription={o} index={i} onTap={onTap} notifyDaysBefore={settings.notifyDaysBefore} />
                ) : (
                  <LoanCard key={o.id} obligation={o} index={i} onTap={onTap} />
                ),
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
