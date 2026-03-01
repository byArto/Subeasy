'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTelegramContext } from '@/components/providers/TelegramProvider';
import { usePro } from '@/components/providers/ProProvider';
import { createClient } from '@/lib/supabase';

type Plan = 'monthly' | 'yearly' | 'lifetime';

const FEATURES = [
  {
    icon: '🤖',
    ru: { name: 'AI инсайты', desc: '«Тратишь на стриминг больше среднего» и другие умные подсказки' },
    en: { name: 'AI Insights', desc: '"You spend more on streaming than average" and other smart tips' },
  },
  {
    icon: '👨‍👩‍👧',
    ru: { name: 'Семейный план', desc: 'Совместный доступ и разделение расходов до 6 человек' },
    en: { name: 'Family Plan', desc: 'Shared access and split expenses for up to 6 people' },
  },
  {
    icon: '🔔',
    ru: { name: 'Telegram-уведомления', desc: 'Напоминания прямо в чат с кнопками действий' },
    en: { name: 'Telegram Notifications', desc: 'Reminders in chat with quick action buttons' },
  },
  {
    icon: '💱',
    ru: { name: 'Мультивалюта', desc: 'EUR, GBP, TRY, KZT, AMD — всё в одном месте' },
    en: { name: 'Multi-currency', desc: 'EUR, GBP, TRY, KZT, AMD — all in one place' },
  },
  {
    icon: '📈',
    ru: { name: 'История цен', desc: 'Видишь когда и насколько выросла цена подписки' },
    en: { name: 'Price History', desc: 'See when and how much a subscription price changed' },
  },
  {
    icon: '🗂',
    ru: { name: 'Архив подписок', desc: 'Отменённые подписки хранятся — история всегда под рукой' },
    en: { name: 'Subscription Archive', desc: 'Cancelled subscriptions stay saved — history always available' },
  },
  {
    icon: '🎨',
    ru: { name: 'Визуальные темы', desc: 'Акцентные цвета интерфейса и светлая тема' },
    en: { name: 'Visual Themes', desc: 'Interface accent colors and light theme' },
  },
];

const PLAN_CONFIG = {
  monthly:  { stars: 249,  labelRu: 'Месяц',    labelEn: 'Month',    periodRu: '/мес',   periodEn: '/mo' },
  yearly:   { stars: 1799, labelRu: 'Год',       labelEn: 'Year',     periodRu: '/год',   periodEn: '/yr', badgeRu: 'Выгода −40%', badgeEn: 'Save −40%' },
  lifetime: { stars: 2999, labelRu: 'Навсегда',  labelEn: 'Lifetime', periodRu: '',       periodEn: '' },
} as const;

export function ProModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lang } = useLanguage();
  const { isTelegram } = useTelegramContext();
  const { refreshProStatus } = usePro();

  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);

  const isRu = lang === 'ru';

  async function handleBuy() {
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(isRu ? 'Нужна авторизация' : 'Authorization required');
        return;
      }

      const res = await fetch('/api/telegram/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (isRu ? 'Ошибка. Попробуйте ещё раз.' : 'Error. Please try again.'));
        return;
      }

      // Open Telegram Stars payment UI
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp?.openInvoice) {
        webApp.openInvoice(data.url, (status: string) => {
          if (status === 'paid') {
            setPaid(true);
            // Refresh PRO status after short delay so webhook has time to fire
            setTimeout(() => {
              refreshProStatus();
            }, 1500);
          }
        });
      } else {
        // Fallback: open invoice link directly (non-Mini App context)
        window.open(data.url, '_blank');
      }
    } catch {
      setError(isRu ? 'Ошибка соединения. Попробуйте ещё раз.' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={paid ? undefined : onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 50,
            }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 51,
              background: '#161616',
              borderRadius: '24px 24px 0 0',
              maxHeight: '92dvh',
              overflowY: 'auto',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 40,
                height: 4,
                background: 'rgba(255,255,255,0.15)',
                borderRadius: 2,
                margin: '12px auto 0',
              }}
            />

            {/* Header */}
            <div style={{ padding: '20px 24px 0', textAlign: 'center' }}>
              <span style={{ fontSize: 44, display: 'block', marginBottom: 10 }}>👑</span>

              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                <span style={{ color: '#f5c842' }}>Sub</span>Easy <span style={{ color: '#f5c842' }}>PRO</span>
              </h2>

              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 6, marginBottom: 0 }}>
                {isRu ? 'Максимум контроля над подписками' : 'Full control over your subscriptions'}
              </p>

              {/* Status badge */}
              <div
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(245,200,66,0.1)',
                  border: '1px solid rgba(245,200,66,0.25)',
                  borderRadius: 20,
                  padding: '5px 12px',
                }}
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#f5c842',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f5c842' }}>
                  {isRu ? 'Telegram Stars · Мгновенная активация' : 'Telegram Stars · Instant activation'}
                </span>
              </div>
            </div>

            {/* Features list */}
            <div style={{ padding: '20px 20px 0' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  marginBottom: 12,
                  marginTop: 0,
                }}
              >
                {isRu ? 'Что входит в PRO' : "What's included in PRO"}
              </p>

              {FEATURES.map((f) => (
                <div
                  key={f.en.name}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    background: '#1e1e1e',
                    borderRadius: 14,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: '#262626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 19,
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {isRu ? f.ru.name : f.en.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 2,
                        lineHeight: 1.45,
                      }}
                    >
                      {isRu ? f.ru.desc : f.en.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer — plan selector + buy button */}
            <div style={{ padding: '20px 20px env(safe-area-inset-bottom, 20px)' }}>
              <AnimatePresence mode="wait">
                {paid ? (
                  /* Success screen */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      textAlign: 'center',
                      padding: '24px 0',
                    }}
                  >
                    <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                    <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
                      {isRu ? 'PRO активирован!' : 'PRO activated!'}
                    </p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
                      {isRu ? 'Все функции уже доступны' : 'All features are now available'}
                    </p>
                    <button
                      onClick={onClose}
                      style={{
                        background: 'linear-gradient(135deg, #f5c842, #e8a800)',
                        color: '#0e0e0e',
                        fontSize: 15,
                        fontWeight: 800,
                        width: '100%',
                        padding: 16,
                        borderRadius: 14,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {isRu ? 'Отлично!' : 'Awesome!'}
                    </button>
                  </motion.div>
                ) : isTelegram ? (
                  /* Stars payment UI */
                  <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Plan selector */}
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.3)',
                        margin: '0 0 10px',
                      }}
                    >
                      {isRu ? 'Выберите план' : 'Choose plan'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      {(Object.keys(PLAN_CONFIG) as Plan[]).map((plan) => {
                        const cfg = PLAN_CONFIG[plan];
                        const isSelected = selectedPlan === plan;
                        const hasBadge = 'badgeRu' in cfg;
                        return (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            style={{
                              background: isSelected ? 'rgba(245,200,66,0.12)' : '#1e1e1e',
                              border: `1.5px solid ${isSelected ? '#f5c842' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 14,
                              padding: '10px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                              position: 'relative',
                              transition: 'border-color 0.15s, background 0.15s',
                            }}
                          >
                            {hasBadge && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: -8,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  background: '#f5c842',
                                  color: '#0e0e0e',
                                  fontSize: 9,
                                  fontWeight: 800,
                                  borderRadius: 6,
                                  padding: '2px 5px',
                                  whiteSpace: 'nowrap',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {isRu ? (cfg as { badgeRu: string }).badgeRu : (cfg as { badgeEn: string }).badgeEn}
                              </div>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#f5c842' : 'rgba(255,255,255,0.7)' }}>
                              {isRu ? cfg.labelRu : cfg.labelEn}
                            </span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: isSelected ? '#f5c842' : '#fff' }}>
                              ⭐ {cfg.stars}
                            </span>
                            {cfg.periodRu && (
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                                {isRu ? cfg.periodRu : cfg.periodEn}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Error */}
                    {error && (
                      <p style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center', margin: '0 0 10px' }}>
                        {error}
                      </p>
                    )}

                    {/* Buy button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleBuy}
                      disabled={loading}
                      style={{
                        background: loading ? 'rgba(245,200,66,0.4)' : 'linear-gradient(135deg, #f5c842, #e8a800)',
                        color: '#0e0e0e',
                        fontSize: 15,
                        fontWeight: 800,
                        width: '100%',
                        padding: 16,
                        borderRadius: 14,
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'block',
                        boxSizing: 'border-box',
                      }}
                    >
                      {loading
                        ? (isRu ? 'Загрузка…' : 'Loading…')
                        : `⭐ ${isRu ? 'Купить PRO' : 'Buy PRO'} · ${PLAN_CONFIG[selectedPlan].stars} ${isRu ? 'звёзд' : 'Stars'}`}
                    </motion.button>

                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: '10px 0 0' }}>
                      {isRu ? 'Оплата через Telegram Stars · Мгновенная активация' : 'Payment via Telegram Stars · Instant activation'}
                    </p>
                  </motion.div>
                ) : (
                  /* Not in Telegram — show instruction */
                  <motion.div key="not-telegram" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div
                      style={{
                        background: '#1e1e1e',
                        borderRadius: 14,
                        padding: '16px',
                        textAlign: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>📱</span>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>
                        {isRu ? 'Оплата через Telegram' : 'Pay via Telegram'}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
                        {isRu
                          ? 'Откройте SubEasy через Telegram-бота, чтобы оплатить звёздами'
                          : 'Open SubEasy via Telegram bot to pay with Stars'}
                      </p>
                    </div>

                    <button
                      onClick={onClose}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: 13,
                        fontWeight: 500,
                        width: '100%',
                        padding: 12,
                        cursor: 'pointer',
                        display: 'block',
                        boxSizing: 'border-box',
                      }}
                    >
                      {isRu ? 'Закрыть' : 'Close'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
