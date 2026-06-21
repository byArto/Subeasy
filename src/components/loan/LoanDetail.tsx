'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Subscription, AppSettings } from '@/lib/types';
import { Badge, Button } from '@/components/ui';
import { AmortizationTable } from './AmortizationTable';
import { cn, getDaysUntilPayment, getThemeAccentColor } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { buildSchedule, summarizeLoan, loanProgressPct, type LoanInput } from '@/lib/loanUtils';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { haptic } from '@/lib/haptic';

interface LoanDetailProps {
  obligation: Subscription;
  settings: AppSettings;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function formatDate(iso: string, lang: string): string {
  const date = new Date(iso);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatShort(iso: string, lang: string): string {
  const date = new Date(iso);
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function LoanDetail({ obligation: o, settings, onClose, onEdit, onDelete }: LoanDetailProps) {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accentColor = getThemeAccentColor(o.color, theme);
  const symbol = CURRENCY_SYMBOLS[o.currency] || o.currency;
  const monogram = (o.lender ?? o.name).charAt(0).toUpperCase();
  const days = getDaysUntilPayment(o.nextPaymentDate);
  const isMortgage = o.kind === 'mortgage';

  const badgeLabel = days < 0
    ? t('status.overdue')
    : days === 0 ? t('status.today')
    : days === 1 ? t('status.tomorrow')
    : t('status.days', { days });
  const badgeVariant = days <= 1 ? 'danger' as const : days <= 7 ? 'warning' as const : 'success' as const;

  const progress = o.principalAmount && o.outstandingBalance !== undefined
    ? loanProgressPct(o.principalAmount, o.outstandingBalance)
    : null;

  // Build amortization if we have enough data
  const loanInput = useMemo((): LoanInput | null => {
    const bal = o.outstandingBalance;
    if (!bal || bal <= 0) return null;
    // Infer term if not provided: balance / payment, capped at 360
    const term = o.termMonths && o.termMonths > 0
      ? o.termMonths
      : o.price > 0 ? Math.min(Math.ceil(bal / o.price), 360) : 0;
    if (term <= 0) return null;
    return {
      balance: bal,
      annualRatePct: o.interestRate ?? 0,
      termMonths: term,
      scheme: o.paymentScheme ?? 'annuity',
      startDate: o.nextPaymentDate,
      monthlyPayment: o.price > 0 ? o.price : undefined,
    };
  }, [o]);

  const schedule = useMemo(() => loanInput ? buildSchedule(loanInput) : [], [loanInput]);
  const summary = useMemo(() => loanInput ? summarizeLoan(loanInput) : null, [loanInput]);

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* Header: monogram + name + badge */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-[20px] shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          {monogram}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-bold text-text truncate">{o.lender ?? o.name}</p>
          {o.lender && o.name !== o.lender && (
            <p className="text-[13px] text-text-secondary truncate">{o.name}</p>
          )}
        </div>
        <Badge variant={badgeVariant} pulse={days <= 1}>{badgeLabel}</Badge>
      </div>

      {/* Balance headline */}
      <div className="bg-surface-2 rounded-2xl p-4">
        <p className="text-[11px] text-text-secondary mb-1">
          {lang === 'en' ? 'Outstanding balance' : 'Остаток долга'}
        </p>
        <p className="text-[28px] font-bold text-text leading-none">
          {(o.outstandingBalance ?? 0).toLocaleString('ru-RU')} {symbol}
        </p>
        {o.principalAmount && (
          <p className="text-[12px] text-text-secondary mt-1">
            {lang === 'en'
              ? `of ${o.principalAmount.toLocaleString('ru-RU')} ${symbol} total`
              : `из ${o.principalAmount.toLocaleString('ru-RU')} ${symbol}`}
          </p>
        )}
      </div>

      {/* Payment + date row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-[11px] text-text-secondary mb-0.5">
            {lang === 'en' ? 'Monthly payment' : 'Платёж в месяц'}
          </p>
          <p className="text-[17px] font-bold" style={{ color: accentColor }}>
            {o.price.toLocaleString('ru-RU')} {symbol}
          </p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-[11px] text-text-secondary mb-0.5">
            {lang === 'en' ? 'Next payment' : 'Следующий платёж'}
          </p>
          <p className="text-[17px] font-bold text-text">{formatShort(o.nextPaymentDate, lang)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="bg-surface-2 rounded-2xl p-4">
          <div className="flex justify-between text-[12px] text-text-secondary mb-2">
            <span>{lang === 'en' ? 'Paid' : 'Выплачено'}</span>
            <span className="font-semibold" style={{ color: accentColor }}>{progress}%</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: accentColor }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Summary stats (if schedule available) */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {o.interestRate ? (
            <div className="bg-surface-2 rounded-xl p-3">
              <p className="text-[11px] text-text-secondary mb-0.5">
                {lang === 'en' ? 'Overpayment' : 'Переплата'}
              </p>
              <p className="text-[15px] font-bold text-warning">
                {summary.totalInterest.toLocaleString('ru-RU')} {symbol}
              </p>
            </div>
          ) : null}
          {summary.payoffDate && (
            <div className="bg-surface-2 rounded-xl p-3">
              <p className="text-[11px] text-text-secondary mb-0.5">
                {lang === 'en' ? 'Payoff date' : 'Закрытие'}
              </p>
              <p className="text-[15px] font-bold text-text">{formatDate(summary.payoffDate, lang)}</p>
            </div>
          )}
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-[11px] text-text-secondary mb-0.5">
              {lang === 'en' ? 'Payments left' : 'Платежей осталось'}
            </p>
            <p className="text-[15px] font-bold text-text">{summary.remainingPayments}</p>
          </div>
          {o.interestRate ? (
            <div className="bg-surface-2 rounded-xl p-3">
              <p className="text-[11px] text-text-secondary mb-0.5">
                {lang === 'en' ? 'Rate' : 'Ставка'}
              </p>
              <p className="text-[15px] font-bold text-text">{o.interestRate}%</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Amortization schedule */}
      {schedule.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-text-secondary mb-3">
            {lang === 'en' ? 'Payment schedule' : 'График платежей'}
          </p>
          <AmortizationTable rows={schedule} currencySymbol={symbol} />
        </div>
      )}

      {/* Property name (mortgage) */}
      {isMortgage && o.propertyName && (
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-[11px] text-text-secondary mb-0.5">
            {lang === 'en' ? 'Property' : 'Объект'}
          </p>
          <p className="text-[14px] font-semibold text-text">{o.propertyName}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        {confirmDelete ? (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { haptic.error(); onDelete(); }}
            className="flex-1 min-h-[48px] rounded-xl bg-danger/10 border border-danger/40 text-danger text-sm font-semibold"
          >
            {lang === 'en' ? 'Confirm delete' : 'Подтвердить удаление'}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => { haptic.tap(); setConfirmDelete(true); }}
            className="min-h-[48px] px-4 rounded-xl bg-surface-2 border border-border-subtle text-text-secondary text-sm font-semibold"
          >
            {lang === 'en' ? 'Delete' : 'Удалить'}
          </motion.button>
        )}
        <Button variant="primary" className="flex-1" onClick={() => { haptic.tap(); onEdit(); }}>
          {lang === 'en' ? 'Edit' : 'Редактировать'}
        </Button>
      </div>
    </div>
  );
}
