'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Subscription, AppSettings } from '@/lib/types';
import { Badge, Button } from '@/components/ui';
import { AmortizationTable } from './AmortizationTable';
import { cn, getDaysUntilPayment, getThemeAccentColor } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { buildSchedule, summarizeLoan, loanProgressPct, applyExtraPayment, type ExtraStrategy } from '@/lib/loanUtils';
import { obligationToLoanInput } from '@/lib/obligations';
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

/** "15000000" → "15 000 000" for display; parse back ignoring spaces/commas. */
function fmtNum(raw: string): string {
  if (!raw) return '';
  const [int, dec] = raw.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}
function parseNum(s: string): number {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0;
}

type ExtraKind = 'lump' | 'monthly';

export function LoanDetail({ obligation: o, settings, onClose, onEdit, onDelete }: LoanDetailProps) {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Досрочное погашение
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraKind, setExtraKind] = useState<ExtraKind>('lump');
  const [extraStrategy, setExtraStrategy] = useState<ExtraStrategy>('reduceTerm');
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
  const loanInput = useMemo(() => obligationToLoanInput(o), [o]);

  const schedule = useMemo(() => loanInput ? buildSchedule(loanInput) : [], [loanInput]);
  const summary = useMemo(() => loanInput ? summarizeLoan(loanInput) : null, [loanInput]);

  // Расчёт досрочного погашения по введённой сумме
  const extraResult = useMemo(() => {
    if (!loanInput) return null;
    const amt = parseNum(extraAmount);
    if (amt <= 0) return null;
    const opts = extraKind === 'monthly'
      ? { strategy: 'reduceTerm' as ExtraStrategy, extraMonthly: amt }
      : { strategy: extraStrategy, lumpSum: amt };
    return applyExtraPayment(loanInput, opts);
  }, [loanInput, extraAmount, extraKind, extraStrategy]);

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

      {/* Досрочное погашение (early repayment what-if) */}
      {loanInput && (
        <div className="bg-surface-2 rounded-2xl p-4">
          <button
            type="button"
            onClick={() => { haptic.tap(); setExtraOpen((v) => !v); }}
            className="flex items-center justify-between w-full"
          >
            <span className="text-[14px] font-bold text-text">
              {lang === 'en' ? '💰 Early repayment' : '💰 Досрочное погашение'}
            </span>
            <motion.span animate={{ rotate: extraOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
              <ChevronDownIcon className="w-4 h-4 text-text-muted" />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {extraOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 pt-4">
                  {/* Amount */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fmtNum(extraAmount)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\s/g, '').replace(',', '.');
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) setExtraAmount(raw);
                    }}
                    placeholder={lang === 'en' ? 'Extra amount' : 'Сумма доплаты'}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-surface-3 border border-border-subtle text-sm text-text tabular-nums outline-none focus:border-neon/40"
                  />

                  {/* Kind: one-time vs recurring */}
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { v: 'lump' as ExtraKind, ru: 'Разовый', en: 'One-time' },
                      { v: 'monthly' as ExtraKind, ru: 'Ежемесячно', en: 'Monthly' },
                    ]).map(({ v, ru, en }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setExtraKind(v)}
                        className={cn(
                          'py-2 rounded-xl text-[13px] font-semibold transition-colors',
                          extraKind === v ? 'bg-neon text-surface' : 'bg-surface-3 border border-border-subtle text-text-secondary'
                        )}
                      >
                        {lang === 'en' ? en : ru}
                      </button>
                    ))}
                  </div>

                  {/* Strategy: only meaningful for a one-time lump sum */}
                  {extraKind === 'lump' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { v: 'reduceTerm' as ExtraStrategy, ru: 'Сократить срок', en: 'Cut term' },
                        { v: 'reducePayment' as ExtraStrategy, ru: 'Снизить платёж', en: 'Lower payment' },
                      ]).map(({ v, ru, en }) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setExtraStrategy(v)}
                          className={cn(
                            'py-2 rounded-xl text-[13px] font-semibold transition-colors',
                            extraStrategy === v ? 'bg-neon text-surface' : 'bg-surface-3 border border-border-subtle text-text-secondary'
                          )}
                        >
                          {lang === 'en' ? en : ru}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted px-0.5">
                      {lang === 'en'
                        ? 'Recurring extra payments shorten the term.'
                        : 'Ежемесячные доплаты сокращают срок кредита.'}
                    </p>
                  )}

                  {/* Result */}
                  {extraResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-2 pt-1"
                    >
                      {extraStrategy === 'reducePayment' && extraKind === 'lump' ? (
                        <div className="bg-surface-3 rounded-xl p-3">
                          <p className="text-[11px] text-text-secondary mb-0.5">
                            {lang === 'en' ? 'New payment' : 'Новый платёж'}
                          </p>
                          <p className="text-[15px] font-bold text-neon">
                            {Math.round(extraResult.newMonthlyPayment).toLocaleString('ru-RU')} {symbol}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-surface-3 rounded-xl p-3">
                          <p className="text-[11px] text-text-secondary mb-0.5">
                            {lang === 'en' ? 'Closes earlier' : 'Закрытие раньше'}
                          </p>
                          <p className="text-[15px] font-bold text-neon">
                            {extraResult.monthsSaved} {lang === 'en' ? 'mo' : 'мес'}
                          </p>
                        </div>
                      )}
                      <div className="bg-surface-3 rounded-xl p-3">
                        <p className="text-[11px] text-text-secondary mb-0.5">
                          {lang === 'en' ? 'Interest saved' : 'Экономия'}
                        </p>
                        <p className="text-[15px] font-bold text-success">
                          {Math.round(extraResult.interestSaved).toLocaleString('ru-RU')} {symbol}
                        </p>
                      </div>
                      {extraResult.next.payoffDate && (
                        <div className="bg-surface-3 rounded-xl p-3 col-span-2">
                          <p className="text-[11px] text-text-secondary mb-0.5">
                            {lang === 'en' ? 'New payoff date' : 'Новая дата закрытия'}
                          </p>
                          <p className="text-[14px] font-semibold text-text">
                            {formatDate(extraResult.next.payoffDate, lang)}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
