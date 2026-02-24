'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Category, AppSettings, Subscription } from '@/lib/types';
import { cn, sanitizeUrl } from '@/lib/utils';
import { requestNotificationPermission } from '@/lib/notifications';
import { useSound } from '@/hooks/useSound';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { usePro } from '@/components/providers/ProProvider';
import { Button } from '@/components/ui';

/* ── Props ── */

interface SettingsPageProps {
  settings: AppSettings;
  updateSettings: (u: Partial<AppSettings>) => void;
  toggleCurrency: () => void;
  setExchangeRate: (r: number) => void;
  categories: Category[];
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, u: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  subscriptions: Subscription[];
  rateLastUpdated: string | null;
  rateIsLoading: boolean;
  onRefreshRate: () => Promise<number>;
  onOpenPro: () => void;
}

/* ── Stagger ── */

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: 'spring' as const, stiffness: 300, damping: 30 },
  }),
};

/* ── Notify days options ── */

const NOTIFY_OPTIONS = [1, 2, 3, 5, 7];

/* ── Component ── */

export function SettingsPage({
  settings,
  updateSettings,
  toggleCurrency,
  setExchangeRate,
  categories,
  addCategory,
  updateCategory,
  deleteCategory,
  subscriptions,
  rateLastUpdated,
  rateIsLoading,
  onRefreshRate,
  onOpenPro,
}: SettingsPageProps) {
  const { user, signOut, setSkipAuth } = useAuth();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useSound();
  const { lang, setLang, t } = useLanguage();
  const { isPro } = usePro();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatEmoji, setEditCatEmoji] = useState('');

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📦');

  const [confirmClear, setConfirmClear] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let sectionIdx = 0;

  /* ── Handlers ── */

  async function handleToggleNotifications() {
    if (!settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        updateSettings({ notificationsEnabled: true });
      }
    } else {
      updateSettings({ notificationsEnabled: false });
    }
  }

  function handleExport() {
    const data = {
      subscriptions,
      categories,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.5.1',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subeasy-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data || typeof data !== 'object') throw new Error('invalid');

        if (Array.isArray(data.subscriptions)) {
          // Sanitize managementUrl in every imported subscription
          const sanitized = data.subscriptions.map((s: Record<string, unknown>) => ({
            ...s,
            managementUrl: sanitizeUrl(typeof s.managementUrl === 'string' ? s.managementUrl : ''),
          }));
          localStorage.setItem('neonsub-subscriptions', JSON.stringify(sanitized));
        }
        if (Array.isArray(data.categories)) {
          localStorage.setItem('neonsub-categories', JSON.stringify(data.categories));
        }
        if (data.settings && typeof data.settings === 'object') {
          localStorage.setItem('neonsub-settings', JSON.stringify(data.settings));
        }
        window.location.reload();
      } catch {
        alert(t('settings.data.importError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClearAll() {
    localStorage.removeItem('neonsub-subscriptions');
    localStorage.removeItem('neonsub-categories');
    localStorage.removeItem('neonsub-settings');
    window.location.reload();
  }

  function startEditCategory(cat: Category) {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatEmoji(cat.emoji);
  }

  function saveEditCategory() {
    if (!editingCatId || !editCatName.trim()) return;
    updateCategory(editingCatId, { name: editCatName.trim(), emoji: editCatEmoji });
    setEditingCatId(null);
  }

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName.trim(), emoji: newCatEmoji, color: '#8E8E93' });
    setNewCatName('');
    setNewCatEmoji('📦');
    setShowNewCat(false);
  }

  return (
    <div className="space-y-6 px-5 pt-2 pb-4">

      {/* ── PRO Plan Banner ── */}
      <div
        onClick={onOpenPro}
        style={{
          background: 'rgba(245,200,66,0.06)',
          border: '1px solid rgba(245,200,66,0.2)',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#39ff84', letterSpacing: '0.08em' }}>FREE</span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            {lang === 'ru' ? 'Текущий план' : 'Current plan'}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f5c842' }}>
          👑 {lang === 'ru' ? 'PRO скоро →' : 'PRO soon →'}
        </span>
      </div>

      {/* ── 0. Язык / Language ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.language.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
          <LangGrid value={lang} onSelect={(l) => setLang(l)} isPro={isPro} onOpenPro={onOpenPro} />
        </div>
      </motion.div>

      {/* ── 1. Валюта ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.currency.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-4">
          {/* Currency toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary font-medium">{t('settings.currency.main')}</span>
            <CurrencySwitch value={settings.displayCurrency} onToggle={toggleCurrency} isPro={isPro} onOpenPro={onOpenPro} />
          </div>

          {/* Current rate display */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary font-medium">
                  1$ = {settings.exchangeRate}₽ · 1€ = {settings.eurExchangeRate ?? 105}₽
                </span>
                {rateIsLoading && (
                  <svg className="animate-spin h-3.5 w-3.5 text-neon" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                {settings.useManualRate
                  ? t('settings.currency.manualRate')
                  : rateLastUpdated
                    ? `${t('settings.currency.cbrf')} · ${formatRateDate(rateLastUpdated, lang)}`
                    : `${t('settings.currency.cbrf')} · ${t('settings.currency.loading')}`}
              </p>
            </div>

            {/* Refresh button */}
            {!settings.useManualRate && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.9, rotate: 180 }}
                disabled={rateIsLoading}
                onClick={() => onRefreshRate()}
                className={cn(
                  'w-9 h-9 shrink-0 rounded-xl flex items-center justify-center',
                  'bg-surface-3 border border-border-subtle',
                  'text-text-secondary active:text-neon active:border-neon/30',
                  'transition-colors disabled:opacity-40'
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              </motion.button>
            )}
          </div>

          {/* Manual rate toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
            <div>
              <span className="text-sm text-text-primary font-medium">{t('settings.currency.customRate')}</span>
              <p className="text-[11px] text-text-muted mt-0.5">{t('settings.currency.customRateHint')}</p>
            </div>
            <NeonToggle
              value={settings.useManualRate}
              onToggle={() => updateSettings({ useManualRate: !settings.useManualRate })}
            />
          </div>

          {/* Manual rate input */}
          <AnimatePresence>
            {settings.useManualRate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-secondary">{t('settings.currency.usdRub')}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={settings.exchangeRate}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) setExchangeRate(v);
                    }}
                    className={cn(
                      'w-24 min-h-[40px] px-3 rounded-xl bg-surface-3 border border-border-subtle',
                      'text-sm text-text-primary text-right outline-none tabular-nums',
                      'focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.1)]',
                      'appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    )}
                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── 2. Уведомления ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.notifications.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4 space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary font-medium">{t('settings.notifications.enable')}</span>
            <NeonToggle
              value={settings.notificationsEnabled}
              onToggle={handleToggleNotifications}
            />
          </div>

          {/* Days selector */}
          {settings.notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary font-medium">{t('settings.notifications.remindBefore')}</span>
                <div className="flex gap-1">
                  {NOTIFY_OPTIONS.map((d) => (
                    <motion.button
                      key={d}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => updateSettings({ notifyDaysBefore: d })}
                      className={cn(
                        'min-w-[36px] min-h-[36px] rounded-lg text-xs font-semibold transition-colors',
                        settings.notifyDaysBefore === d
                          ? 'bg-neon text-surface'
                          : 'bg-surface-3 text-text-secondary active:bg-surface-4'
                      )}
                    >
                      {d}{t('settings.notifications.daySuffix')}
                    </motion.button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-text-muted mt-2 pl-0.5">
                {t('settings.notifications.hint')}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── 3. Звуки ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.sounds.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text-primary font-medium">{t('settings.sounds.effects')}</span>
              <p className="text-[11px] text-text-muted mt-0.5">{t('settings.sounds.hint')}</p>
            </div>
            <NeonToggle
              value={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
            />
          </div>
        </div>
      </motion.div>

      {/* ── 4. Категории ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.categories.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle overflow-hidden">
          {/* Collapsible header */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setCategoriesOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-surface-3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-primary font-medium">{t('settings.categories.all')}</span>
              <span className="text-xs text-text-muted">{categories.length}</span>
            </div>
            <motion.svg
              animate={{ rotate: categoriesOpen ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-text-muted"
            >
              <path d="m6 9 6 6 6-6" />
            </motion.svg>
          </motion.button>

          {/* Expandable content */}
          <AnimatePresence initial={false}>
            {categoriesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border-subtle">
                  <AnimatePresence initial={false}>
                    {categories.map((cat, i) => (
                      <CategoryRow
                        key={cat.id}
                        category={cat}
                        isLast={i === categories.length - 1 && !showNewCat}
                        isEditing={editingCatId === cat.id}
                        editName={editCatName}
                        editEmoji={editCatEmoji}
                        onEditNameChange={setEditCatName}
                        onEditEmojiChange={setEditCatEmoji}
                        onStartEdit={() => startEditCategory(cat)}
                        onSaveEdit={saveEditCategory}
                        onCancelEdit={() => setEditingCatId(null)}
                        onDelete={() => deleteCategory(cat.id)}
                        deleteLabelText={t('settings.categories.delete')}
                        namePlaceholder={t('settings.categories.namePlaceholder')}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Add new category */}
                  <AnimatePresence>
                    {showNewCat && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-border-subtle"
                      >
                        <div className="flex items-center gap-2.5 px-4 py-3">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            onClick={() => {
                              const emojis = ['📦', '🎯', '🏷️', '⭐', '🔥', '💡', '🎁', '🌟', '🎪', '🛒'];
                              const idx = emojis.indexOf(newCatEmoji);
                              setNewCatEmoji(emojis[(idx + 1) % emojis.length]);
                            }}
                            className="w-9 h-9 shrink-0 rounded-lg bg-surface-3 flex items-center justify-center text-lg"
                          >
                            {newCatEmoji}
                          </motion.button>
                          <input
                            type="text"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            placeholder={t('settings.categories.namePlaceholder')}
                            autoFocus
                            className={cn(
                              'flex-1 min-h-[36px] px-3 rounded-lg bg-surface-3 border border-border-subtle',
                              'text-sm text-text-primary outline-none placeholder:text-text-muted/50',
                              'focus:border-neon/40'
                            )}
                          />
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={handleAddCategory}
                            disabled={!newCatName.trim()}
                            className={cn(
                              'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold',
                              newCatName.trim() ? 'bg-neon text-surface' : 'bg-surface-3 text-text-muted'
                            )}
                          >
                            ✓
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setShowNewCat(false); setNewCatName(''); }}
                            className="w-9 h-9 shrink-0 rounded-lg bg-surface-3 flex items-center justify-center text-sm text-text-muted"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Add button */}
                  {!showNewCat && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowNewCat(true)}
                      className="w-full flex items-center gap-2.5 px-4 py-3.5 border-t border-border-subtle text-neon active:bg-neon/5 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-lg bg-neon/10 flex items-center justify-center text-neon text-sm font-bold">+</span>
                      <span className="text-sm font-medium">{t('settings.categories.add')}</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── 5. Данные ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.data.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle overflow-hidden">
          <SettingsRow label={t('settings.data.export')} hint={t('settings.data.exportHint')} onTap={handleExport} />
          <SettingsRow label={t('settings.data.import')} hint={t('settings.data.importHint')} onTap={handleImport} isLast={false} />

          {/* Clear data */}
          <AnimatePresence mode="wait">
            {!confirmClear ? (
              <motion.button
                key="clear-btn"
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-danger/5 transition-colors"
              >
                <span className="text-sm text-danger font-medium">{t('settings.data.clearAll')}</span>
                <span className="text-xs text-text-muted">{subscriptions.length} {t('settings.data.subscriptionsCount')}</span>
              </motion.button>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3.5 space-y-2.5"
              >
                <p className="text-xs text-danger font-medium">{t('settings.data.clearConfirmText')}</p>
                <div className="flex gap-2">
                  <Button fullWidth variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button fullWidth variant="danger" size="sm" onClick={handleClearAll}>
                    {t('settings.data.deleteAll')}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onFileSelected}
          className="hidden"
        />
      </motion.div>

      {/* ── 6. Аккаунт ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.account.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle overflow-hidden">
          {user ? (
            <>
              <div className="px-4 py-3.5 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neon/15 flex items-center justify-center">
                    <span className="text-neon text-sm font-bold">
                      {user.email?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate">{user.email}</p>
                    <p className="text-[11px] text-text-muted">{t('settings.account.synced')}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!confirmLogout ? (
                  <motion.button
                    key="logout-btn"
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setConfirmLogout(true)}
                    className="w-full flex items-center justify-between px-4 py-3.5 active:bg-danger/5 transition-colors"
                  >
                    <span className="text-sm text-danger font-medium">{t('settings.account.logout')}</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="logout-confirm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 py-3.5 space-y-2.5"
                  >
                    <p className="text-xs text-text-secondary">
                      {t('settings.account.logoutConfirmText')}
                    </p>
                    <div className="flex gap-2">
                      <Button fullWidth variant="secondary" size="sm" onClick={() => setConfirmLogout(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button fullWidth variant="danger" size="sm" onClick={() => { signOut(); setConfirmLogout(false); }}>
                        {t('settings.account.logoutConfirm')}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setSkipAuth(false)}
              className="w-full flex items-center justify-between px-4 py-3.5 active:bg-neon/5 transition-colors"
            >
              <div>
                <span className="text-sm text-neon font-medium">{t('settings.account.login')}</span>
                <p className="text-[11px] text-text-muted mt-0.5">{t('settings.account.loginHint')}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ── 7. О приложении ── */}
      <motion.div custom={sectionIdx++} variants={sectionVariants} initial="hidden" animate="visible">
        <SectionHeader title={t('settings.about.title')} />
        <div className="bg-surface-2 rounded-2xl border border-border-subtle p-6 flex flex-col items-center gap-3">
          {/* App logo */}
          <img
            src="/icons/icon-192x192.png"
            alt="SubEasy"
            className="w-16 h-16 rounded-2xl"
            style={{
              boxShadow: '0 0 24px rgba(0,255,65,0.15)',
            }}
          />

          <h2 className="font-display font-extrabold text-2xl neon-text text-neon tracking-tight">
            SubEasy
          </h2>
          <p className="text-xs text-text-muted">{t('settings.about.version')} 1.5.1</p>
          <p className="text-xs text-text-secondary text-center leading-relaxed">
            {t('settings.about.description')}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Section Header ── */

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2 pl-1">
      {title}
    </h3>
  );
}

/* ── Settings Row ── */

function SettingsRow({
  label,
  hint,
  onTap,
  isLast = false,
}: {
  label: string;
  hint?: string;
  onTap: () => void;
  isLast?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3.5',
        'active:bg-surface-4 transition-colors',
        !isLast && 'border-b border-border-subtle'
      )}
    >
      <span className="text-sm text-text-primary font-medium">{label}</span>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </motion.button>
  );
}

/* ── Neon Toggle ── */

function NeonToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative w-[52px] h-[30px] rounded-full p-[3px] transition-colors duration-200',
        value ? 'bg-neon' : 'bg-surface-4'
      )}
      style={value ? { boxShadow: '0 0 12px rgba(0, 255, 65, 0.3)' } : undefined}
    >
      <motion.span
        animate={{ x: value ? 22 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'block w-6 h-6 rounded-full',
          value ? 'bg-surface' : 'bg-text-muted'
        )}
      />
    </motion.button>
  );
}

/* ── Format rate date ── */

function formatRateDate(iso: string, lang: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  if (isToday) {
    const timeStr = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return lang === 'en' ? `today, ${timeStr}` : `сегодня, ${timeStr}`;
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/* ── Language Grid ── */

import { Lang } from '@/lib/translations';

const LANG_OPTIONS: { code: Lang; label: string; name: string }[] = [
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'tr', label: 'TR', name: 'Türkçe' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'kk', label: 'KK', name: 'Қазақша' },
  { code: 'hy', label: 'HY', name: 'Հայերեն' },
  { code: 'pl', label: 'PL', name: 'Polski' },
];

const FREE_LANGS: Lang[] = ['ru', 'en'];

function LangGrid({
  value,
  onSelect,
  isPro,
  onOpenPro,
}: {
  value: Lang;
  onSelect: (l: Lang) => void;
  isPro: boolean;
  onOpenPro: () => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {LANG_OPTIONS.map((opt) => {
        const locked = !isPro && !FREE_LANGS.includes(opt.code);
        const active = value === opt.code;
        return (
          <motion.button
            key={opt.code}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => locked ? onOpenPro() : onSelect(opt.code)}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl border transition-colors',
              active
                ? 'bg-neon/15 border-neon/40 text-neon'
                : locked
                  ? 'bg-surface-3 border-border-subtle text-text-muted opacity-60'
                  : 'bg-surface-3 border-border-subtle text-text-secondary active:bg-surface-4'
            )}
            style={active ? { boxShadow: '0 0 10px rgba(0,255,65,0.15)' } : undefined}
          >
            {locked && (
              <span className="absolute top-1 right-1.5 text-[8px] text-text-muted">🔒</span>
            )}
            <span className="text-[11px] font-bold tracking-wide">{opt.label}</span>
            <span className="text-[9px] opacity-70 leading-none">{opt.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Currency Switch ── */

import { DisplayCurrency } from '@/lib/types';

const CURRENCY_OPTIONS: { code: DisplayCurrency; symbol: string }[] = [
  { code: 'RUB', symbol: '₽' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
];

function CurrencySwitch({
  value,
  onToggle,
  isPro,
  onOpenPro,
}: {
  value: DisplayCurrency;
  onToggle: () => void;
  isPro: boolean;
  onOpenPro: () => void;
}) {
  return (
    <div className="relative flex items-center h-[40px] rounded-xl bg-surface-3 border border-border-subtle p-1 gap-0.5">
      {CURRENCY_OPTIONS.map((opt) => {
        const locked = !isPro && opt.code === 'EUR';
        return (
          <motion.button
            key={opt.code}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => locked ? onOpenPro() : onToggle()}
            className={cn(
              'relative z-10 w-[44px] h-[32px] rounded-lg text-sm font-bold transition-colors',
              value === opt.code
                ? 'bg-neon text-surface'
                : locked
                  ? 'text-text-muted opacity-50'
                  : 'text-text-secondary'
            )}
            style={value === opt.code ? { boxShadow: '0 0 12px rgba(0,255,65,0.3)' } : undefined}
          >
            {locked ? '🔒' : opt.symbol}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Category Row with swipe-to-delete ── */

function CategoryRow({
  category: cat,
  isLast,
  isEditing,
  editName,
  editEmoji,
  onEditNameChange,
  onEditEmojiChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  deleteLabelText,
  namePlaceholder,
}: {
  category: Category;
  isLast: boolean;
  isEditing: boolean;
  editName: string;
  editEmoji: string;
  onEditNameChange: (v: string) => void;
  onEditEmojiChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  deleteLabelText: string;
  namePlaceholder: string;
}) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60], [1, 0]);
  const deleteScale = useTransform(x, [-100, -60], [1, 0.8]);

  function handleDragEnd() {
    if (x.get() < -80) {
      onDelete();
    }
  }

  if (isEditing) {
    return (
      <motion.div
        initial={{ backgroundColor: 'rgba(0,255,65,0.03)' }}
        animate={{ backgroundColor: 'rgba(0,255,65,0.03)' }}
        className={cn('flex items-center gap-2.5 px-4 py-3', !isLast && 'border-b border-border-subtle')}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            const emojis = ['📦', '🎬', '🎵', '💻', '☁️', '🎮', '📚', '🤖', '🔒', '🎯', '🏷️', '⭐'];
            const idx = emojis.indexOf(editEmoji);
            onEditEmojiChange(emojis[(idx + 1) % emojis.length]);
          }}
          className="w-9 h-9 shrink-0 rounded-lg bg-surface-3 flex items-center justify-center text-lg"
        >
          {editEmoji}
        </motion.button>
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          autoFocus
          className={cn(
            'flex-1 min-h-[36px] px-3 rounded-lg bg-surface-3 border border-neon/30',
            'text-sm text-text-primary outline-none'
          )}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onSaveEdit}
          className="w-9 h-9 shrink-0 rounded-lg bg-neon flex items-center justify-center text-sm font-bold text-surface"
        >
          ✓
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onCancelEdit}
          className="w-9 h-9 shrink-0 rounded-lg bg-surface-3 flex items-center justify-center text-sm text-text-muted"
        >
          ✕
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      exit={{ opacity: 0, height: 0 }}
      className={cn('relative overflow-hidden', !isLast && 'border-b border-border-subtle')}
    >
      {/* Delete background */}
      <motion.div
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-danger/10"
      >
        <span className="text-danger text-xs font-semibold">{deleteLabelText}</span>
      </motion.div>

      {/* Draggable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative flex items-center gap-3 px-4 py-3.5 bg-surface-2 cursor-grab active:cursor-grabbing"
      >
        <span className="text-lg shrink-0">{cat.emoji}</span>
        <span className="flex-1 text-sm text-text-primary font-medium">{cat.name}</span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onStartEdit}
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-text-muted active:bg-surface-4 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
