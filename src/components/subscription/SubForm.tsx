'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subscription, Currency, BillingCycle, Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS, CYCLE_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { searchServices, ServiceTemplate } from '@/lib/services';

/* ── Constants ── */

const EMOJI_GRID = [
  '📺', '🎵', '💻', '☁️', '🎮', '📚',
  '🤖', '🔒', '📦', '💳', '🏠', '🚗',
  '✈️', '💪', '📱', '🎨', '📧', '🔔',
];

const COLOR_PALETTE = [
  '#FF0000', '#FF4444', '#FF9500', '#FFCC00',
  '#34C759', '#00FF41', '#5AC8FA', '#007AFF',
  '#AF52DE', '#FF2D55', '#D4A574', '#8E8E93',
];

const CURRENCIES: Currency[] = ['RUB', 'USD'];
const CYCLES: BillingCycle[] = ['monthly', 'yearly', 'weekly', 'one-time', 'trial'];

/* ── Payment method encoding ── */

type PaymentType = 'card' | 'crypto' | 'sbp' | 'other';
type CardType = 'physical' | 'virtual';

const PAYMENT_TYPES: { type: PaymentType; label: string }[] = [
  { type: 'card', label: 'Карта' },
  { type: 'crypto', label: 'Крипто' },
  { type: 'sbp', label: 'СБП' },
  { type: 'other', label: 'Другое' },
];

function parsePaymentMethod(raw: string): { type: PaymentType; cardType: CardType; detail: string } {
  if (raw.startsWith('card:')) {
    const rest = raw.substring(5);
    const idx = rest.indexOf(':');
    if (idx >= 0) {
      const ct = rest.substring(0, idx) === 'virtual' ? 'virtual' : 'physical';
      return { type: 'card', cardType: ct, detail: rest.substring(idx + 1) };
    }
    return { type: 'card', cardType: 'physical', detail: '' };
  }
  if (raw.startsWith('crypto:')) return { type: 'crypto', cardType: 'physical', detail: raw.substring(7) };
  if (raw.startsWith('sbp:')) return { type: 'sbp', cardType: 'physical', detail: raw.substring(4) };
  if (raw.startsWith('paypal:')) return { type: 'sbp', cardType: 'physical', detail: raw.substring(7) }; // migrate paypal → sbp
  if (raw.startsWith('other:')) return { type: 'other', cardType: 'physical', detail: raw.substring(6) };

  // Legacy values
  if (raw === 'Карта' || raw === 'Apple Pay' || raw === 'Google Pay') return { type: 'card', cardType: 'physical', detail: '' };
  if (raw === 'Крипто') return { type: 'crypto', cardType: 'physical', detail: '' };
  if (raw === 'PayPal' || raw === 'СБП') return { type: 'sbp', cardType: 'physical', detail: '' };
  return { type: 'other', cardType: 'physical', detail: raw === 'Другое' ? '' : raw };
}

function encodePaymentMethod(type: PaymentType, cardType: CardType, detail: string): string {
  const d = detail.trim();
  switch (type) {
    case 'card': return `card:${cardType}:${d}`;
    case 'crypto': return `crypto:${d}`;
    case 'sbp': return `sbp:${d}`;
    case 'other': return `other:${d}`;
  }
}

/* ── Types ── */

interface SubFormProps {
  mode: 'add' | 'edit';
  initialData?: Subscription;
  categories: Category[];
  onSubmit: (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
  onAddCategory: (cat: Omit<Category, 'id'>) => void;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
  price?: string;
  category?: string;
  nextPaymentDate?: string;
}

/* ── Stagger animation ── */

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: 'spring' as const, stiffness: 300, damping: 30 },
  }),
};

/* ── Component ── */

export function SubForm({
  mode,
  initialData,
  categories,
  onSubmit,
  onDelete,
  onAddCategory,
  onClose,
}: SubFormProps) {
  /* ── State ── */
  const [icon, setIcon] = useState(initialData?.icon || '📺');
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(initialData?.currency || 'RUB');
  const [cycle, setCycle] = useState<BillingCycle>(initialData?.cycle || 'monthly');
  const [category, setCategory] = useState(initialData?.category || '');
  const [nextPaymentDate, setNextPaymentDate] = useState(
    initialData?.nextPaymentDate || new Date().toISOString().split('T')[0]
  );
  const initialParsed = parsePaymentMethod(initialData?.paymentMethod || 'Карта');
  const [paymentType, setPaymentType] = useState<PaymentType>(initialParsed.type);
  const [cardType, setCardType] = useState<CardType>(initialParsed.cardType);
  const [paymentDetail, setPaymentDetail] = useState(initialParsed.detail);
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date().toISOString().split('T')[0]
  );
  const [managementUrl, setManagementUrl] = useState(initialData?.managementUrl || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [color, setColor] = useState(initialData?.color || '#007AFF');

  const [errors, setErrors] = useState<FormErrors>({});
  const [shake, setShake] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📦');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestions, setSuggestions] = useState<ServiceTemplate[]>([]);

  /* ── Service autocomplete ── */

  function handleNameChange(value: string) {
    setName(value);
    if (mode === 'add' && value.length >= 1) {
      setSuggestions(searchServices(value));
    } else {
      setSuggestions([]);
    }
  }

  function applyService(svc: ServiceTemplate) {
    setName(svc.name);
    setIcon(svc.emoji);
    setColor(svc.color);
    setPrice(svc.defaultPrice.toString());
    setCurrency(svc.defaultCurrency);
    setCycle(svc.cycle);
    setCategory(svc.categoryId);
    setSuggestions([]);
  }

  /* ── Validation ── */

  function validate(): boolean {
    const e: FormErrors = {};

    if (!name.trim()) e.name = 'Укажите название';
    if (cycle === 'trial') {
      if (price && parseFloat(price) < 0) e.price = 'Цена не может быть отрицательной';
    } else {
      if (!price || parseFloat(price) <= 0) e.price = 'Укажите цену';
    }
    if (!category) e.category = 'Выберите категорию';
    if (!nextPaymentDate) e.nextPaymentDate = 'Укажите дату';

    setErrors(e);

    if (Object.keys(e).length > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return false;
    }

    return true;
  }

  /* ── Submit ── */

  function handleSubmit() {
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      price: parseFloat(price) || 0,
      currency,
      category,
      cycle,
      nextPaymentDate,
      startDate,
      paymentMethod: encodePaymentMethod(paymentType, cardType, paymentDetail),
      managementUrl: managementUrl.trim(),
      notes: notes.trim(),
      color,
      icon,
      isActive: initialData?.isActive ?? true,
    });
  }

  /* ── Add new category ── */

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    onAddCategory({ name: newCatName.trim(), emoji: newCatEmoji, color });
    setShowNewCategory(false);
    setNewCatName('');
    // The new category will appear in the list; we don't auto-select since we
    // don't know the generated ID. User picks it from the dropdown.
  }

  /* ── Field index for stagger ── */
  let fieldIndex = 0;

  return (
    <motion.div
      animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 pb-2"
    >
      {/* ── Emoji Picker ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-3"
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmojiPicker((p) => !p)}
          className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl',
            'bg-surface-3 border-2 transition-colors',
            showEmojiPicker ? 'border-neon/50' : 'border-border-subtle'
          )}
          style={{ background: `${color}15` }}
        >
          {icon}
        </motion.button>

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden w-full"
            >
              <div className="grid grid-cols-6 gap-2 p-3 bg-surface-2 rounded-xl border border-border-subtle">
                {EMOJI_GRID.map((emoji) => (
                  <motion.button
                    key={emoji}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                      setIcon(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className={cn(
                      'w-full aspect-square rounded-lg flex items-center justify-center text-xl',
                      'transition-colors',
                      icon === emoji
                        ? 'bg-neon/15 border border-neon/30'
                        : 'active:bg-surface-4'
                    )}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Name + Autocomplete ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="relative"
      >
        <FieldLabel text="Название" error={errors.name} />
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Netflix, Spotify, ChatGPT..."
          autoComplete="off"
          className={cn(
            'w-full min-h-[48px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
            'outline-none transition-all duration-200 placeholder:text-text-muted/50',
            errors.name
              ? 'border-danger/40'
              : 'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
          )}
        />

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface-3 border border-border-subtle rounded-xl overflow-hidden shadow-lg"
            >
              {suggestions.map((svc) => (
                <motion.button
                  key={svc.name}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => applyService(svc)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-surface-4 transition-colors border-b border-border-subtle last:border-b-0"
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: `${svc.color}20` }}
                  >
                    <ServiceLogo name={svc.name} emoji={svc.emoji} size={20} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{svc.name}</p>
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {svc.defaultPrice}{CURRENCY_SYMBOLS[svc.defaultCurrency] || svc.defaultCurrency}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Price + Currency ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text={cycle === 'trial' ? 'Цена после триала' : 'Стоимость'} error={errors.price} />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={cycle === 'trial' ? '0 (бесплатно)' : '0'}
            className={cn(
              'flex-1 min-h-[48px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
              'outline-none transition-all duration-200 placeholder:text-text-muted/50',
              'appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              errors.price
                ? 'border-danger/40'
                : 'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
            )}
            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
          />

          {/* Currency pills */}
          <div className="flex gap-1 bg-surface-2 border border-border-subtle rounded-xl p-1">
            {CURRENCIES.map((c) => (
              <motion.button
                key={c}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setCurrency(c)}
                className={cn(
                  'min-w-[40px] min-h-[40px] rounded-lg text-sm font-semibold transition-colors',
                  currency === c
                    ? 'bg-neon text-surface'
                    : 'text-text-secondary active:bg-surface-4'
                )}
              >
                {CURRENCY_SYMBOLS[c]}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Billing Cycle ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Период оплаты" />
        <div className="flex flex-wrap gap-1.5">
          {CYCLES.map((c) => (
            <motion.button
              key={c}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => setCycle(c)}
              className={cn(
                'min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap',
                cycle === c
                  ? 'bg-neon text-surface'
                  : 'bg-surface-2 border border-border-subtle text-text-secondary active:bg-surface-4'
              )}
            >
              {CYCLE_LABELS[c]}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Category ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Категория" error={errors.category} />
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => setCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 min-h-[36px] px-3 rounded-full text-xs font-semibold transition-colors',
                category === cat.id
                  ? 'bg-neon text-surface'
                  : 'bg-surface-2 border border-border-subtle text-text-secondary active:bg-surface-4'
              )}
            >
              <span className="text-sm">{cat.emoji}</span>
              {cat.name}
            </motion.button>
          ))}

          {/* "+ New" pill */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowNewCategory((p) => !p)}
            className={cn(
              'flex items-center gap-1 min-h-[36px] px-3 rounded-full text-xs font-semibold',
              'border border-dashed transition-colors',
              showNewCategory
                ? 'border-neon/40 text-neon bg-neon/5'
                : 'border-border-subtle text-text-muted active:bg-surface-4'
            )}
          >
            <span className="text-sm">+</span>
            Новая
          </motion.button>
        </div>

        {/* Inline new category form */}
        <AnimatePresence>
          {showNewCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 mt-2.5">
                {/* Emoji selector for new category */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const emojis = ['📦', '🎯', '🏷️', '⭐', '🔥', '💡', '🎁', '🌟'];
                    const idx = emojis.indexOf(newCatEmoji);
                    setNewCatEmoji(emojis[(idx + 1) % emojis.length]);
                  }}
                  className="w-[48px] h-[48px] shrink-0 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-xl"
                >
                  {newCatEmoji}
                </motion.button>

                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Название категории"
                  className={cn(
                    'flex-1 min-h-[48px] px-3.5 rounded-xl bg-surface-2 border border-border-subtle',
                    'text-sm text-text-primary outline-none placeholder:text-text-muted/50',
                    'focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
                  )}
                />

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className={cn(
                    'w-[48px] h-[48px] shrink-0 rounded-xl flex items-center justify-center text-lg',
                    'transition-colors',
                    newCatName.trim()
                      ? 'bg-neon text-surface'
                      : 'bg-surface-3 text-text-muted'
                  )}
                >
                  ✓
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Next Payment Date ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text={cycle === 'trial' ? 'Дата окончания триала' : 'Дата следующего платежа'} error={errors.nextPaymentDate} />
        <input
          type="date"
          value={nextPaymentDate}
          onChange={(e) => setNextPaymentDate(e.target.value)}
          className={cn(
            'w-full min-h-[48px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
            'outline-none transition-all duration-200',
            '[color-scheme:dark]',
            errors.nextPaymentDate
              ? 'border-danger/40'
              : 'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
          )}
        />
      </motion.div>

      {/* ── Start Date ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Дата начала подписки" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={cn(
            'w-full min-h-[48px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
            'outline-none transition-all duration-200',
            '[color-scheme:dark]',
            'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
          )}
        />
      </motion.div>

      {/* ── Management URL ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Ссылка на управление" />
        <input
          type="url"
          value={managementUrl}
          onChange={(e) => setManagementUrl(e.target.value)}
          placeholder="https://account.spotify.com/subscription"
          className={cn(
            'w-full min-h-[48px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
            'outline-none transition-all duration-200 placeholder:text-text-muted/50',
            'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
          )}
        />
      </motion.div>

      {/* ── Payment Method ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Способ оплаты" />

        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_TYPES.map((m) => (
            <motion.button
              key={m.type}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                if (m.type !== paymentType) {
                  setPaymentType(m.type);
                  setPaymentDetail('');
                  if (m.type === 'card') setCardType('physical');
                }
              }}
              className={cn(
                'min-h-[36px] px-3.5 rounded-full text-xs font-semibold transition-colors',
                paymentType === m.type
                  ? 'bg-neon text-surface'
                  : 'bg-surface-2 border border-border-subtle text-text-secondary active:bg-surface-4'
              )}
            >
              {m.label}
            </motion.button>
          ))}
        </div>

        {/* Expandable details per type */}
        <AnimatePresence mode="wait">
          {paymentType === 'card' && (
            <motion.div
              key="card-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 mt-2.5">
                {/* Physical / Virtual toggle */}
                <div className="flex gap-1.5">
                  {([
                    { value: 'physical' as const, label: '🏦 Физическая' },
                    { value: 'virtual' as const, label: '📱 Виртуальная' },
                  ]).map((ct) => (
                    <motion.button
                      key={ct.value}
                      type="button"
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setCardType(ct.value)}
                      className={cn(
                        'flex-1 min-h-[36px] rounded-xl text-xs font-semibold transition-colors',
                        cardType === ct.value
                          ? 'bg-surface-4 text-text-primary border border-neon/30'
                          : 'bg-surface-2 border border-border-subtle text-text-secondary active:bg-surface-4'
                      )}
                    >
                      {ct.label}
                    </motion.button>
                  ))}
                </div>

                {/* Card name */}
                <input
                  type="text"
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder="Название карты (Tinkoff Black, Альфа...)"
                  className={cn(
                    'w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
                    'outline-none transition-all duration-200 placeholder:text-text-muted/50',
                    'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
                  )}
                />
              </div>
            </motion.div>
          )}

          {paymentType === 'crypto' && (
            <motion.div
              key="crypto-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5">
                <input
                  type="text"
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder="Кошелёк / сеть (Bitcoin, USDT TRC-20...)"
                  className={cn(
                    'w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
                    'outline-none transition-all duration-200 placeholder:text-text-muted/50',
                    'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
                  )}
                />
              </div>
            </motion.div>
          )}

          {paymentType === 'sbp' && (
            <motion.div
              key="sbp-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5">
                <input
                  type="text"
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder="Банк или номер телефона"
                  className={cn(
                    'w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
                    'outline-none transition-all duration-200 placeholder:text-text-muted/50',
                    'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
                  )}
                />
              </div>
            </motion.div>
          )}

          {paymentType === 'other' && (
            <motion.div
              key="other-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5">
                <input
                  type="text"
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder="Способ оплаты..."
                  className={cn(
                    'w-full min-h-[44px] px-3.5 rounded-xl bg-surface-2 border text-sm text-text-primary',
                    'outline-none transition-all duration-200 placeholder:text-text-muted/50',
                    'border-border-subtle focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
                  )}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Color ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Цвет карточки" />
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((c) => (
            <motion.button
              key={c}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setColor(c)}
              className={cn(
                'w-8 h-8 rounded-full transition-all',
                color === c && 'ring-2 ring-offset-2 ring-offset-surface ring-neon scale-110'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Notes ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FieldLabel text="Заметки" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Промокод, семейная подписка, условия..."
          rows={3}
          className={cn(
            'w-full px-3.5 py-3 rounded-xl bg-surface-2 border border-border-subtle',
            'text-sm text-text-primary outline-none resize-none',
            'placeholder:text-text-muted/50 transition-all duration-200',
            'focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]'
          )}
        />
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        custom={fieldIndex++}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2.5 pt-2"
      >
        <Button fullWidth size="lg" onClick={handleSubmit}>
          {mode === 'add' ? 'Добавить подписку' : 'Сохранить'}
        </Button>

        {mode === 'edit' && onDelete && (
          <AnimatePresence mode="wait">
            {!confirmDelete ? (
              <motion.div key="delete-btn" exit={{ opacity: 0, height: 0 }}>
                <Button
                  fullWidth
                  variant="danger"
                  size="md"
                  onClick={() => setConfirmDelete(true)}
                >
                  Удалить подписку
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="confirm-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <Button
                  fullWidth
                  variant="secondary"
                  size="md"
                  onClick={() => setConfirmDelete(false)}
                >
                  Отмена
                </Button>
                <Button
                  fullWidth
                  variant="danger"
                  size="md"
                  onClick={onDelete}
                >
                  Да, удалить
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <Button fullWidth variant="ghost" size="md" onClick={onClose}>
          Отмена
        </Button>
      </motion.div>
    </motion.div>
  );
}

/* ── Field Label ── */

function FieldLabel({ text, error }: { text: string; error?: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5 pl-1">
      <span className="text-xs text-text-secondary font-medium">{text}</span>
      {error && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-danger"
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}
