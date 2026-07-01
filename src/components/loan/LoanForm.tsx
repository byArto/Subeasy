'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type { Subscription, Currency, ObligationKind, LoanType, PaymentScheme } from '@/lib/types';
import { cn, getThemeAccentColor } from '@/lib/utils';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { Button } from '@/components/ui';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { haptic } from '@/lib/haptic';
import { searchBanks, type BankTemplate } from '@/lib/banks';

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

/* ── Number formatting helpers ── */

/** Format raw numeric string with space as thousands separator: "15000000" → "15 000 000" */
function fmtNum(raw: string): string {
  if (!raw) return '';
  const [int, dec] = raw.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

/** Strip spaces and replace comma with dot to get a parseable number string */
function stripNum(s: string): string {
  return s.replace(/\s/g, '').replace(',', '.');
}

/** Parse a (possibly formatted) number string to float */
function parseNum(s: string): number {
  return parseFloat(stripNum(s)) || 0;
}

/** Handle a change event on a formatted number input.
 *  Strips formatting, validates the raw value, calls setter if valid.
 */
function handleNumChange(value: string, setter: (v: string) => void) {
  const raw = stripNum(value);
  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
    setter(raw);
  }
}

/* ── Helpers ── */

const today = () => new Date().toISOString().split('T')[0];

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
  const [bankSuggestions, setBankSuggestions] = useState<BankTemplate[]>([]);

  // Raw number strings (no formatting) — formatted on display
  const [outstandingBalance, setOutstandingBalance] = useState(
    initialData?.outstandingBalance?.toString() ?? ''
  );
  const [price, setPrice] = useState(initialData?.price?.toString() ?? '');
  const [nextPaymentDate, setNextPaymentDate] = useState(
    initialData?.nextPaymentDate ?? today()
  );
  // When the borrower started repaying (usually a date in the past). Lets us show
  // real repayment progress rather than assuming payments began today.
  const [startDate, setStartDate] = useState(
    initialData?.startDate ?? today()
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

  /* ── Bank autocomplete ── */

  function handleLenderChange(value: string) {
    setLender(value);
    setBankSuggestions(value.length >= 1 ? searchBanks(value) : []);
  }

  function applyBank(bank: BankTemplate) {
    haptic.tap();
    setLender(bank.name);
    setColor(bank.color);
    // «Название» не трогаем — банк и название кредита должны оставаться раздельными
    // (на карточке название идёт первой строкой, банк — под ним).
    setBankSuggestions([]);
  }

  /* ── Validation + Submit ── */

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = lang === 'en' ? 'Required' : 'Обязательно';
    if (parseNum(outstandingBalance) <= 0) errs.outstandingBalance = lang === 'en' ? 'Required' : 'Обязательно';
    if (parseNum(price) <= 0) errs.price = lang === 'en' ? 'Required' : 'Обязательно';
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
      startDate: startDate || nextPaymentDate,
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

  // Shared classes for formatted number inputs
  const numFieldCls = cn(fieldCls, 'tabular-nums');

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* Name + Color */}
      <div>
        <FieldLabel text={lang === 'en' ? 'Name' : 'Название'} error={errors.name} />
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
            placeholder={isMortgage
              ? (lang === 'en' ? 'e.g. Sberbank mortgage' : 'Напр. Ипотека Сбер')
              : (lang === 'en' ? 'e.g. Consumer loan' : 'Напр. Кредит Тинькофф')}
            className={cn(fieldCls, 'flex-1', errors.name && 'border-danger/40')}
          />
          {/* Auto icon — shows the obligation type (💳 credit / 🏦 mortgage)
              tinted with the selected/bank colour, instead of the old first-letter
              monogram. It's an automatic, meaningful preview of the card icon. */}
          <div
            className="w-[48px] h-[48px] rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <span className="text-2xl leading-none">{isMortgage ? '🏦' : '💳'}</span>
          </div>
        </div>
        {/* Color palette */}
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

      {/* Bank / Lender with autocomplete */}
      <div className="relative">
        <FieldLabel text={lang === 'en' ? 'Bank / Lender' : 'Банк / Кредитор'} />
        <input
          type="text"
          value={lender}
          onChange={(e) => handleLenderChange(e.target.value)}
          onBlur={() => setTimeout(() => setBankSuggestions([]), 150)}
          placeholder={lang === 'en' ? 'Sberbank, Tinkoff…' : 'Сбер, Тинькофф…'}
          className={fieldCls}
          autoComplete="off"
        />
        <AnimatePresence>
          {bankSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl bg-surface-3 border border-border-subtle shadow-xl overflow-hidden"
            >
              {bankSuggestions.map((bank) => (
                <button
                  key={bank.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => applyBank(bank)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-4 active:bg-surface-4 transition-colors text-left"
                >
                  {/* Mini monogram */}
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                    style={{ backgroundColor: bank.color }}
                  >
                    {bank.name.charAt(0)}
                  </span>
                  <span className="text-[14px] text-text-primary font-medium">{bank.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Outstanding balance + Currency */}
      <div>
        <FieldLabel
          text={lang === 'en' ? 'Outstanding balance' : 'Остаток долга'}
          error={errors.outstandingBalance}
        />
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={fmtNum(outstandingBalance)}
            onChange={(e) => {
              handleNumChange(e.target.value, setOutstandingBalance);
              setErrors((p) => ({ ...p, outstandingBalance: undefined }));
            }}
            placeholder="0"
            className={cn(numFieldCls, 'flex-1', errors.outstandingBalance && 'border-danger/40')}
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
          type="text"
          inputMode="decimal"
          value={fmtNum(price)}
          onChange={(e) => {
            handleNumChange(e.target.value, setPrice);
            setErrors((p) => ({ ...p, price: undefined }));
          }}
          placeholder="0"
          className={cn(numFieldCls, errors.price && 'border-danger/40')}
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

      {/* Loan start date — when repayment began */}
      <div>
        <FieldLabel text={lang === 'en' ? 'Payments started' : 'Начало выплат'} />
        <input
          type="date"
          value={startDate}
          max={nextPaymentDate || undefined}
          onChange={(e) => setStartDate(e.target.value)}
          className={fieldCls}
        />
        <p className="text-[11px] text-text-muted mt-1 px-0.5">
          {lang === 'en'
            ? 'When you started repaying — used to show progress.'
            : 'Когда вы начали выплачивать кредит — нужно для прогресса.'}
        </p>
      </div>

      {/* Loan type (credits only) */}
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

      {/* Property name (mortgage only) */}
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

      {/* Details toggle */}
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
            {/* Original loan amount */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Original loan amount' : 'Исходная сумма кредита'} />
              <input
                type="text"
                inputMode="decimal"
                value={fmtNum(principalAmount)}
                onChange={(e) => handleNumChange(e.target.value, setPrincipalAmount)}
                placeholder={lang === 'en' ? 'For progress bar' : 'Для прогресс-бара'}
                className={numFieldCls}
              />
            </div>

            {/* Interest rate */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Annual interest rate (%)' : 'Ставка % годовых'} />
              <input
                type="text"
                inputMode="decimal"
                value={interestRate}
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  if (v === '' || /^\d*\.?\d*$/.test(v)) setInterestRate(v);
                }}
                placeholder="0"
                className={fieldCls}
              />
            </div>

            {/* Term months */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Remaining term (months)' : 'Оставшийся срок (мес)'} />
              <input
                type="text"
                inputMode="numeric"
                value={termMonths}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setTermMonths(v);
                }}
                placeholder={lang === 'en' ? 'e.g. 240' : 'напр. 240'}
                className={fieldCls}
              />
            </div>

            {/* Payment scheme with info tooltips */}
            <div>
              <FieldLabel text={lang === 'en' ? 'Payment scheme' : 'Схема погашения'} />
              <div className="flex gap-2">
                {([
                  {
                    value: 'annuity' as PaymentScheme,
                    label: lang === 'en' ? 'Annuity' : 'Аннуитет',
                    hint: lang === 'en'
                      ? 'Same payment every month. Higher total interest, but easy to budget.'
                      : 'Одинаковый платёж весь срок. Чуть больше переплата, зато легко планировать бюджет.',
                  },
                  {
                    value: 'differentiated' as PaymentScheme,
                    label: lang === 'en' ? 'Differentiated' : 'Дифференц.',
                    hint: lang === 'en'
                      ? 'First payments are higher, last ones lower. Less total interest paid.'
                      : 'Первые платежи больше, последние меньше. Итоговая переплата ниже.',
                  },
                ]).map(({ value: s, label, hint }) => {
                  const isActive = paymentScheme === s;
                  return (
                    <div key={s} className="flex-1 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentScheme(s)}
                        className={cn(
                          'w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors',
                          isActive
                            ? 'bg-neon text-surface'
                            : 'bg-surface-2 border border-border-subtle text-text-secondary'
                        )}
                      >
                        {label}
                      </button>
                      {/* Inline hint — always visible under each button */}
                      <p className={cn(
                        'text-[11px] leading-relaxed px-0.5 transition-colors',
                        isActive ? 'text-text-secondary' : 'text-text-muted'
                      )}>
                        {hint}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
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
        <Button variant="primary" className="flex-1" onClick={handleSubmit}>
          {mode === 'add'
            ? (lang === 'en' ? 'Add' : 'Добавить')
            : (lang === 'en' ? 'Save' : 'Сохранить')}
        </Button>
      </div>
    </div>
  );
}
