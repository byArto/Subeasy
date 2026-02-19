'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';

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

export function ProModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { lang } = useLanguage();

  const [waited, setWaited] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pro-waited') === 'true';
  });

  const handleWait = () => {
    if (waited) return;
    localStorage.setItem('pro-waited', 'true');
    setWaited(true);
  };

  const soonLabel = lang === 'ru' ? 'СКОРО' : 'SOON';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                {lang === 'ru'
                  ? 'Максимум контроля над подписками'
                  : 'Full control over your subscriptions'}
              </p>

              {/* Status badge */}
              <div
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(57,255,132,0.1)',
                  border: '1px solid rgba(57,255,132,0.25)',
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
                    background: '#39ff84',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#39ff84' }}>
                  {lang === 'ru' ? 'Скоро · Ранний доступ' : 'Coming soon · Early access'}
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
                {lang === 'ru' ? 'Что войдёт в PRO' : "What's included in PRO"}
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
                      {lang === 'ru' ? f.ru.name : f.en.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 2,
                        lineHeight: 1.45,
                      }}
                    >
                      {lang === 'ru' ? f.ru.desc : f.en.desc}
                    </div>
                  </div>

                  <div
                    style={{
                      marginLeft: 'auto',
                      flexShrink: 0,
                      alignSelf: 'center',
                      background: 'rgba(245,200,66,0.1)',
                      border: '1px solid rgba(245,200,66,0.2)',
                      borderRadius: 6,
                      padding: '2px 7px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#f5c842',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {soonLabel}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 20px env(safe-area-inset-bottom, 20px)' }}>
              {!waited ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleWait}
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
                    display: 'block',
                    boxSizing: 'border-box',
                  }}
                >
                  {lang === 'ru' ? 'Жду анонс' : 'Notify me at launch'}
                </motion.button>
              ) : (
                <motion.div
                  key="waited"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 0.4 }}
                >
                  <div
                    style={{
                      background: 'rgba(57,255,132,0.12)',
                      border: '1px solid rgba(57,255,132,0.3)',
                      color: '#39ff84',
                      fontSize: 15,
                      fontWeight: 800,
                      width: '100%',
                      padding: 16,
                      borderRadius: 14,
                      cursor: 'default',
                      display: 'block',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    {lang === 'ru' ? '✓ Отлично, ждём анонс' : "✓ Got it, we'll let you know"}
                  </div>
                </motion.div>
              )}

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
                  marginTop: 6,
                  display: 'block',
                  boxSizing: 'border-box',
                }}
              >
                {lang === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
