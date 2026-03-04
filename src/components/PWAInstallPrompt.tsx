'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStandaloneMode } from '@/hooks/useStandaloneMode';
import { Button } from '@/components/ui';
import { useTelegramContext } from '@/components/providers/TelegramProvider';

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

const SESSION_KEY = 'neonsub-a2hs-dismissed';

export function PWAInstallPrompt() {
  const isInstalled = useStandaloneMode();
  const { isTelegram } = useTelegramContext();
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    // Only show on mobile, not installed, not dismissed this session, not in Telegram
    const dismissed = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true';
    if (p === 'desktop' || isInstalled || dismissed || isTelegram) return;

    const timer = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(timer);
  }, [isInstalled, isTelegram]);

  function handleDismiss() {
    setShow(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  }

  if (platform === 'desktop') return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
            className="fixed inset-0 z-[100] bg-black/50"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-[101] mx-auto max-w-[430px] px-4 pb-[env(safe-area-inset-bottom)]"
          >
            <div className="bg-surface-2 rounded-t-3xl border border-b-0 border-border-subtle p-6 pb-8">
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-5" />

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center">
                  <img
                    src="/icons/icon-192x192.png"
                    alt="SubEasy"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Установите SubEasy
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Быстрый доступ с домашнего экрана
                  </p>
                </div>
              </div>

              {/* Platform-specific instructions */}
              {platform === 'ios' ? (
                <div className="space-y-3 mb-6">
                  <Step
                    number={1}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16 6 12 2 8 6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    }
                    text='Нажмите "Поделиться" внизу Safari'
                  />
                  <Step
                    number={2}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                    }
                    text='"На экран «Домой»"'
                  />
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  <Step
                    number={1}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon">
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    }
                    text="Нажмите ⋮ в правом верхнем углу браузера"
                  />
                  <Step
                    number={2}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neon">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    }
                    text='"Добавить на главный экран"'
                  />
                </div>
              )}

              {/* CTA button */}
              <Button fullWidth variant="primary" size="lg" onClick={handleDismiss}>
                Понятно
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Step row ── */

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + number * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
      className="flex items-center gap-3 bg-surface-3 rounded-xl px-4 py-3 border border-border-subtle"
    >
      <span className="w-6 h-6 rounded-full bg-neon/10 flex items-center justify-center text-[11px] font-bold text-neon shrink-0">
        {number}
      </span>
      <span className="shrink-0">{icon}</span>
      <span className="text-sm text-text-primary font-medium">{text}</span>
    </motion.div>
  );
}
