'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Subscription, Currency, ObligationKind, LoanType, PaymentScheme } from '@/lib/types';
import { cn, generateId, getThemeAccentColor } from '@/lib/utils';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { Button } from '@/components/ui';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { haptic } from '@/lib/haptic';

/* ── Constants ── */

const COLOR_PALETTE = [
  '#FF4444', '#FF9500', '#FFCC00', '#34C759',
  '#007AFF', '#5AC8FA', '#AF52DE', '#FF2D55',
  '#D4A574', '#8E8E93',
];

const LOAN_TYPES: { value: LoanType; ruLabel: string; enLabel: string }[] = [
  { value: 'consumer', ruLabel: 'Потреб', enLabel: 'Consumer' },
  { value: 'auto',     ruLabel: 'Авто',   enLabel: 'Auto' },
  { value: 'installment', ruLabel: 'Рассрочка', enLabel: 'Installment' },
  { value: 'debt',     ruLabel: 'Долг',   enLabel: 'Debt' },
];

/* ── Helpers ── */

const today = () => new Date().toISOString().split('T')[0];

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

function FieldLabel({ text, error }: { text: string; error?: string }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[13px] font-semibold text-text-secondary">{text}</label>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}

/* ── Props ── */

interface LoanFormProps {
  obligationKind: 'credit' | 'mortgage';
  mode: 'add' | 'edit';
  initialData?: Subscription;
  onSubmit: (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  outstandingBalance?: string;
  price?: string;
  nextPaymentDate?: string;
}

/* ── Component ── */

export function LoanForm({ obligationKind, mode, initialData, onSubmit, onDelete, onClose }: LoanFormProps) {
  const { lang, t } = useLanguage();
  const { theme } = useTheme();
  const isMortgage = obligationKind === 'mortgage';

  /* ── State ── */
  const [name, setName] = useState(initialData?.name ?? '');
  const [lender, setLender] = useState(initialData?.lender ?? '');
  const [outstandingBalance, setOutstandingBalance] = useState(
    initialData?.outstandingBalance?.toString() ?? ''
  );
  const [price, setPrice] = useState(initialData?.price?.toString() ?? '');
  const [nextPaymentDate, setNextPaymentDate] = useState(
    initialData?.nextPaymentDate ?? today()
  );
  const [currency, setCurrency] = useState<Currency>(initialData?.currency ?? 'RUB');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [color, setColor] = useState(initialData?.color ?? '#007AFF');

  // Optional detail fields
  const [showDetails, setShowDetails] = useState(mode === 'edit');
  const [principalAmount, setPrincipalAmount] = useState(
    initialData?.principalAmount?.toString() ?? ''
  );
  const [interestRate, setInterestRate] = useState(
    initialData?.interestRate?.toString() ?? ''
  );
  const [termMonths, setTermMonths] = useState(
    initialData?.termMonths?.toString() ?? ''
  );
  const [paymentScheme, setPaymentScheme] = useState<PaymentScheme>(
    initialData?.paymentScheme ?? 'annuity'
  );
  const [loanType, setLoanType] = useState<LoanType>(
    initialData?.loanType ?? (isMortgage ? 'mortgage' : 'consumer')
  );
  const [propertyName, setPropertyName] = useState(initialData?.propertyName ?? '');

  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accentColor = getThemeAccentColor(color, theme);

  /* ── Validation + Submit ── */

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = lang === 'en' ? 'Required' : 'Обязательно';
    const bal = parseNum(outstandingBalance);
    if (!outstandingBalance || bal <= 0) errs.outstandingBalance = lang === 'en' ? 'Required' : 'Обязательно';
    const pmt = parseNum(price);
    if (!price || pmt <= 0) errs.price = lang === 'en' ? 'Required' : 'Обязательно';
    if (!nextPaymentDate) errs.nextPaymentDate = lang === 'en' ? 'Required' : 'Обязательно';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { haptic.error(); return false; }
    return true;
  }

  function handleSubmit() {
    if (!validate()) return;
    haptic.success();

    const bal = parseNum(outstandingBalance);
    const pmt = parseNum(price);
    const principal = parseNum(principalAmount);
    const rate = parseNum(interestRate);
    const term = parseInt(termMonths, 10);

    const data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      icon: isMortgage ? '🏦' : '💳',
      price: pmt,
      currency,
      cycle: 'monthly',
      nextPaymentDate,
      startDate: nextPaymentDate,
      isActive: true,
      color,
      category: '',
      notes: '',
      paymentMethod: 'other',
      managementUrl: '',
      // Loan fields
      kind: obligationKind as ObligationKind,
      lender: lender.trim() || undefined,
      outstandingBalance: bal,
      loanType,
      paymentScheme,
      ...(principal > 0 && { principalAmount: principal }),
      ...(rate > 0 && { interestRate: rate }),
      ...(term > 0 && { termMonths: term }),
      ...(isMortgage && propertyName.trim() && { propertyName: propertyName.trim() }),
    };

    onSubmit(data);
  }

  /* ── Render ── */

  const fieldCls = cn(
    'w-full min-h-[48px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
    'outline-none transition-all duration-200 placeholder:text-text-muted/50',
    'border-border-subtle focus:border-neon/40 focus:shadow-[var(--app-input-focus-shadow)]'
  );

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* Name + Color */}
      <div>
        <FieldLabel
          text={lang === 'en' ? 'Name' : 'Название'}
          error={errors.name}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
            placeholder={isMortgage ? (lang === 'en' ? 'e.g. Sberbank mortgage' : 'Напр. Ипотека Сбер') : (lang === 'en' ? 'e.g. Consumer loan' : 'Напр. Кредит')}
            className={cn(fieldCls, 'flex-1', errors.name && 'border-danger/40')}
          />
          {/* Color dot */}
          <div className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {}} // сворачивать не будем — простая палитра ниже
              className="w-[48px] h-[48px] rounded-xl border border-border-subtle bg-surface-2 flex items-center justify-center"
            >
              <span className="w-5 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
            </motion.button>
          </div>
        </div>
        {/* Color palette — always visible */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'w-6 h-6 rounded-full transition-all',
                color === c && 'ring-2 ring-offset-2 ring-offset-surface ring-neon scale-110'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Lender */}
      <div>
        <FieldLabel text={lang === 'en' ? 'Bank / Lender' : 'Банк / Кредитор'} />
        <input
          type="text"
          value={lender}
          onChange={(e) => setLender(e.target.value)}
          placeholder={lang === 'en' ? 'Sberbank, Tinkoff…' : 'Сбер, Тинькофф…'}
          className={fieldCls}
        />
      </div>

      {/* Outstanding balance */}
      <div>
        <FieldLabel
          text={lang === 'en' ? 'Outstanding balance' : 'Остаток долга'}
          error={errors.outstandingBalance}
        />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={outstandingBalance}
            onChange={(e) => { setOutstandingBalance(e.target.value); setErrors((p) => ({ ...p, outstandingBalance: undefined })); }}
            placeholder="0"
            className={cn(fieldCls, 'flex-1 appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              errors.outstandingBalance && 'border-danger/40')}
          />
          {/* Currency picker */}
          <div className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setCurrencyOpen((v) => !v)}
              className="h-[48px] min-w-[64px] px-3 rounded-xl bg-surface-2 border border-border-subtle flex items-center gap-1.5 text-sm font-semibold text-text-primary"
            >
              <span>{CURRENCY_SYMBOLS[currency] ?? currency}</span>
              <motion.span animate={{ rotate: currencyOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                <ChevronDownIcon className="w-3.5 h-3.5 text-text-muted" />
              </motion.span>
            </motion.button>
            <AnimatePresence>
              {currencyOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCurrencyOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-[calc(100%+6px)] z-50 w-[200px] max-h-[260px] overflow-y-auto rounded-xl bg-surface-3 border border-border-subtle shadow-xl p-1"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                          currency === c.code
                            ? 'bg-neon/10 text-neon font-semibold'
                            : 'text-text-primary hover:bg-surface-4'
                        )}
                      >
                        <span className="text-base">{c.symbol}</span>
                        <span>{c.code}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Monthly payment */}
      <div>
        <FieldLabel
          text={lang === 'en' ? 'Monthly payment' : 'Ежемесячный платёж'}
          error={errors.price}
        />
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => { setPrice(e.target.value); setErrors((p) => ({ ...p, price: undefined })); }}
          placeholder="0"
          className={cn(fieldCls, 'appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            errors.price && 'border-danger/40')}
        />
      </div>

      {/* Next payment date */}
      <div>
        <FieldLabel
          text={lang === 'en' ? 'Next payment date' : 'Дата следующего платежа'}
          error={errors.nextPaymentDate}
        />
        <input
          type="date"
          value={nextPaymentDate}
          onChange={(e) => { setNextPaymentDate(e.target.value); setErrors((p) => ({ ...p, nextPaymentDate: undefined })); }}
          className={cn(fieldCls, errors.nextPaymentDate && 'border-danger/40')}
        />
      </div>

      {/* Loan type (only for credits) */}
      {!isMortgage && (
        <div>
          <FieldLabel text={lang === 'en' ? 'Loan type' : 'Тип кредита'} />
          <div className="flex gap-2 flex-wrap">
            {LOAN_TYPES.map((lt) => (
              <button
                key={lt.value}
                type="button"
                onClick={() => setLoanType(lt.value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors',
                  loanType === lt.value
                    ? 'bg-neon text-surface'
                    : 'bg-surface-2 border border-border-subtle text-text-secondary'
                )}
              >
                {lang === 'en' ? lt.enLabel : lt.ruLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Property name (only for mortgage) */}
      {isMortgage && (
        <div>
          <FieldLabel text={lang === 'en' ? 'Property address / name' : 'Адрес / название объекта'} />
          <input
            type="text"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder={lang === 'en' ? 'Optional' : 'Необязательно'}
            className={fieldCls}
          />
        </div>
      )}

      {/* Details section toggle */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => { haptic.tap(); setShowDetails((v) => !v); }}
        className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl bg-surface-2 border border-border-subtle text-sm text-text-secondary"
      >
        <span className="font-semibold">
          {lang === 'en' ? 'Loan details (optional)' : 'Детали кредита (необязательно)'}
        </span>
        <motion.span animate={{ rotate: showDetails ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col gap-4 overflow-hidden"
          >
            {/* Principal amount */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Original loan amount' : 'Исходная сумма кредита'} />
              <input
                type="number"
                inputMode="decimal"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                placeholder={lang === 'en' ? 'For progress bar' : 'Для прогресс-бара'}
                className={cn(fieldCls, 'appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
              />
            </div>

            {/* Interest rate */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Annual interest rate (%)' : 'Ставка % годовых'} />
              <input
                type="number"
                inputMode="decimal"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="0"
                className={cn(fieldCls, 'appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
              />
            </div>

            {/* Term months */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Remaining term (months)' : 'Оставшийся срок (мес)'} />
              <input
                type="number"
                inputMode="numeric"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                placeholder="0"
                className={cn(fieldCls, 'appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
              />
            </div>

            {/* Payment scheme */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Payment scheme' : 'Схема погашения'} />
              <div className="flex gap-2">
                {(['annuity', 'differentiated'] as PaymentScheme[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPaymentScheme(s)}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-colors',
                      paymentScheme === s
                        ? 'bg-neon text-surface'
                        : 'bg-surface-2 border border-border-subtle text-text-secondary'
                    )}
                  >
                    {s === 'annuity'
                      ? (lang === 'en' ? 'Annuity' : 'Аннуитет')
                      : (lang === 'en' ? 'Differentiated' : 'Дифференц.')}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {mode === 'edit' && onDelete && (
          confirmDelete ? (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { haptic.error(); onDelete(); }}
              className="flex-1 min-h-[48px] rounded-xl bg-danger/10 border border-danger/40 text-danger text-sm font-semibold"
            >
              {lang === 'en' ? 'Confirm delete' : 'Подтвердить'}
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
          )
        )}
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleSubmit}
        >
          {mode === 'add'
            ? (lang === 'en' ? 'Add' : 'Добавить')
            : (lang === 'en' ? 'Save' : 'Сохранить')}
        </Button>
      </div>
    </div>
  );
}
