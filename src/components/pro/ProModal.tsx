'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTelegramContext } from '@/components/providers/TelegramProvider';
import { usePro } from '@/components/providers/ProProvider';
import { createClient } from '@/lib/supabase';

type Plan = 'monthly' | 'yearly' | 'lifetime';

const PLAN_CONFIG = {
  monthly:  { stars: 249,  strikethru: 349,  labelRu: 'Месяц',    labelEn: 'Month',    periodRu: '/мес', periodEn: '/mo' },
  yearly:   { stars: 1799, strikethru: 2988, labelRu: 'Год',       labelEn: 'Year',     periodRu: '/год', periodEn: '/yr', badgeRu: 'Выгода −40%', badgeEn: 'Save −40%' },
  lifetime: { stars: 2999, strikethru: 4999, labelRu: 'Навсегда',  labelEn: 'Lifetime', periodRu: '',     periodEn: '' },
} as const;

const FEATURES = [
  {
    icon: '👨‍👩‍👧',
    ru: { name: 'Семейный план', desc: 'Совместный доступ и расходы до 6 человек' },
    en: { name: 'Family Plan', desc: 'Shared access and expenses for up to 6 people' },
    live: true,
  },
  {
    icon: '🔔',
    ru: { name: 'Telegram-уведомления', desc: 'Напоминание за 1–7 дней до списания' },
    en: { name: 'Telegram Notifications', desc: 'Reminder 1–7 days before payment' },
    live: true,
  },
  {
    icon: '📊',
    ru: { name: 'Бюджетный лимит', desc: 'Контроль расходов с прогресс-баром' },
    en: { name: 'Budget Limit', desc: 'Expense control with progress bar' },
    live: true,
  },
  {
    icon: '🎨',
    ru: { name: 'Новые цветовые палитры', desc: 'Акцентные цвета и темы оформления' },
    en: { name: 'New Color Palettes', desc: 'Accent colors and UI themes' },
    live: false,
  },
  {
    icon: '📄',
    ru: { name: 'PDF / CSV экспорт', desc: 'Выгрузка всех подписок в файл' },
    en: { name: 'PDF / CSV Export', desc: 'Export all subscriptions to a file' },
    live: false,
  },
  {
    icon: '🤖',
    ru: { name: 'AI аудит', desc: 'Найдёт дубли и скрытые переплаты' },
    en: { name: 'AI Audit', desc: 'Finds duplicates and hidden overpayments' },
    live: false,
    dimmed: true,
  },
] as const;

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webApp = (window as any).Telegram?.WebApp;
      if (webApp?.openInvoice) {
        webApp.openInvoice(data.url, (status: string) => {
          if (status === 'paid') {
            setPaid(true);
            setTimeout(() => { refreshProStatus(); }, 1500);
          }
        });
      } else {
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
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '12px auto 0' }} />

            <AnimatePresence mode="wait">
              {paid ? (
                /* ── Success screen ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', padding: '40px 20px calc(env(safe-area-inset-bottom, 20px) + 20px)' }}
                >
                  <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
                  <p style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px' }}>
                    {isRu ? 'PRO активирован!' : 'PRO activated!'}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>
                    {isRu ? 'Все функции уже доступны' : 'All features are now available'}
                  </p>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'linear-gradient(135deg, #f5c842, #e8a800)',
                      color: '#0e0e0e',
                      fontSize: 16,
                      fontWeight: 900,
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
              ) : (
                <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

                  {/* ── Emotional hook ── */}
                  <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
                    <span style={{ fontSize: 42, display: 'block', marginBottom: 10 }}>💸</span>
                    <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.2 }}>
                      {isRu ? 'Сколько ты теряешь прямо сейчас?' : 'How much are you losing right now?'}
                    </h2>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.55 }}>
                      {isRu
                        ? <>Пользователи SubEasy PRO находят в среднем <span style={{ color: '#00FF41', fontWeight: 700 }}>2–3 забытые подписки</span> на сумму <span style={{ color: '#00FF41', fontWeight: 700 }}>~2 400₽/мес</span></>
                        : <>SubEasy PRO users find on average <span style={{ color: '#00FF41', fontWeight: 700 }}>2–3 forgotten subscriptions</span> worth <span style={{ color: '#00FF41', fontWeight: 700 }}>~$30/mo</span></>}
                    </p>
                  </div>

                  {/* ── Plan selector ── */}
                  <div style={{ padding: '16px 16px 0' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 10px' }}>
                      {isRu ? 'Выберите план' : 'Choose plan'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
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
                              gap: 1,
                              position: 'relative',
                              transition: 'border-color 0.15s, background 0.15s',
                            }}
                          >
                            {hasBadge && (
                              <div style={{
                                position: 'absolute',
                                top: -8,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#f5c842',
                                color: '#0e0e0e',
                                fontSize: 8,
                                fontWeight: 900,
                                borderRadius: 6,
                                padding: '2px 5px',
                                whiteSpace: 'nowrap',
                                letterSpacing: '0.03em',
                              }}>
                                {isRu ? (cfg as { badgeRu: string }).badgeRu : (cfg as { badgeEn: string }).badgeEn}
                              </div>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? '#f5c842' : 'rgba(255,255,255,0.6)' }}>
                              {isRu ? cfg.labelRu : cfg.labelEn}
                            </span>
                            {/* Crossed-out original price */}
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textDecoration: 'line-through' }}>
                              {cfg.strikethru}⭐
                            </span>
                            {/* Actual price */}
                            <span style={{ fontSize: 17, fontWeight: 900, color: isSelected ? '#f5c842' : '#fff', lineHeight: 1 }}>
                              {cfg.stars}⭐
                            </span>
                            {cfg.periodRu && (
                              <span style={{ fontSize: 9, color: isSelected ? 'rgba(245,200,66,0.5)' : 'rgba(255,255,255,0.3)' }}>
                                {isRu ? cfg.periodRu : cfg.periodEn}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Error */}
                    {error && (
                      <p style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center', margin: '10px 0 0' }}>
                        {error}
                      </p>
                    )}

                    {/* CTA */}
                    <div style={{ marginTop: 12 }}>
                      {isTelegram ? (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleBuy}
                          disabled={loading}
                          style={{
                            background: loading ? 'rgba(245,200,66,0.4)' : 'linear-gradient(135deg, #f5c842, #e8a800)',
                            color: '#0e0e0e',
                            fontSize: 15,
                            fontWeight: 900,
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
                      ) : (
                        <div style={{ background: '#1e1e1e', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>📱</span>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>
                            {isRu ? 'Оплата через Telegram' : 'Pay via Telegram'}
                          </p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                            {isRu
                              ? 'Откройте SubEasy через Telegram-бота, чтобы оплатить звёздами'
                              : 'Open SubEasy via Telegram bot to pay with Stars'}
                          </p>
                        </div>
                      )}
                    </div>

                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '8px 0 0' }}>
                      {isRu ? 'Мгновенная активация · Telegram Stars' : 'Instant activation · Telegram Stars'}
                    </p>
                  </div>

                  {/* ── Divider ── */}
                  <div style={{ margin: '16px 16px 0', height: 1, background: 'rgba(255,255,255,0.07)' }} />

                  {/* ── What you get ── */}
                  <div style={{ padding: '14px 16px calc(env(safe-area-inset-bottom, 20px) + 20px)' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 12px' }}>
                      {isRu ? 'Что получите' : 'What you get'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {FEATURES.map((f) => {
                        const isDimmed = 'dimmed' in f && f.dimmed;
                        return (
                          <div
                            key={f.en.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              background: f.live
                                ? 'rgba(0,255,65,0.05)'
                                : isDimmed ? 'rgba(255,255,255,0.02)' : '#1e1e1e',
                              border: f.live
                                ? '1px solid rgba(0,255,65,0.14)'
                                : isDimmed ? '1px dashed rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 12,
                              padding: '10px 12px',
                              opacity: isDimmed ? 0.55 : 1,
                            }}
                          >
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isDimmed ? 'rgba(255,255,255,0.5)' : '#fff' }}>
                                {isRu ? f.ru.name : f.en.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1, lineHeight: 1.4 }}>
                                {isRu ? f.ru.desc : f.en.desc}
                              </div>
                            </div>
                            {f.live ? (
                              <span style={{
                                flexShrink: 0,
                                fontSize: 9,
                                fontWeight: 800,
                                color: '#00FF41',
                                background: 'rgba(0,255,65,0.1)',
                                border: '1px solid rgba(0,255,65,0.2)',
                                borderRadius: 6,
                                padding: '2px 6px',
                                letterSpacing: '0.03em',
                              }}>
                                ✓ {isRu ? 'Сейчас' : 'Live'}
                              </span>
                            ) : (
                              <span style={{
                                flexShrink: 0,
                                fontSize: 9,
                                fontWeight: 800,
                                color: isDimmed ? 'rgba(255,255,255,0.3)' : '#f5c842',
                                background: isDimmed ? 'rgba(255,255,255,0.05)' : 'rgba(245,200,66,0.08)',
                                border: `1px solid ${isDimmed ? 'rgba(255,255,255,0.08)' : 'rgba(245,200,66,0.2)'}`,
                                borderRadius: 6,
                                padding: '2px 6px',
                                letterSpacing: '0.03em',
                              }}>
                                {isRu ? 'Скоро' : 'Soon'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!paid && (
                      <button
                        onClick={onClose}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255,255,255,0.25)',
                          fontSize: 13,
                          width: '100%',
                          padding: '14px 0 0',
                          cursor: 'pointer',
                          display: 'block',
                          textAlign: 'center',
                        }}
                      >
                        {isRu ? 'Закрыть' : 'Close'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
