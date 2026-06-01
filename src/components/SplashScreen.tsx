'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICE_CATALOG } from '@/lib/services';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getThemeAccentColor } from '@/lib/utils';
import type { Theme } from '@/lib/themes';

/* ── Split services into 3 rows ── */
const ROW_1 = SERVICE_CATALOG.filter((_, i) => i % 3 === 0);
const ROW_2 = SERVICE_CATALOG.filter((_, i) => i % 3 === 1);
const ROW_3 = SERVICE_CATALOG.filter((_, i) => i % 3 === 2);

function MarqueePill({
  name,
  emoji,
  color,
  theme,
}: {
  name: string;
  emoji: string;
  color: string;
  theme: Theme;
}) {
  const accentColor = getThemeAccentColor(color, theme);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle shrink-0"
      style={{ background: `${accentColor}10` }}
    >
      <ServiceLogo name={name} emoji={emoji} size={20} />
      <span className="text-xs text-text-muted whitespace-nowrap font-medium">
        {name}
      </span>
    </div>
  );
}

function MarqueeRow({
  items,
  direction,
  theme,
  speed = 35,
}: {
  items: typeof SERVICE_CATALOG;
  direction: 'left' | 'right';
  theme: Theme;
  speed?: number;
}) {
  return (
    <div className="overflow-hidden">
      <div
        className="flex gap-3 w-max"
        style={{
          animation: `marquee-${direction} ${speed}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {items.map((svc, i) => (
          <MarqueePill key={`a-${i}`} name={svc.name} emoji={svc.emoji} color={svc.color} theme={theme} />
        ))}
        {items.map((svc, i) => (
          <MarqueePill key={`b-${i}`} name={svc.name} emoji={svc.emoji} color={svc.color} theme={theme} />
        ))}
      </div>
    </div>
  );
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const { lang } = useLanguage();
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'var(--app-splash-bg)' }}
        >
          {/* ── Background marquee rows ── */}
          <div className="absolute inset-0 flex flex-col justify-center gap-3 pointer-events-none">
            {/* Top area — fades in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="space-y-3"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 60%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 60%, transparent 100%)',
              }}
            >
              <MarqueeRow items={ROW_1} direction="left" speed={40} theme={theme} />
              <MarqueeRow items={ROW_2} direction="right" speed={35} theme={theme} />
              <MarqueeRow items={ROW_3} direction="left" speed={45} theme={theme} />
            </motion.div>
          </div>

          {/* ── Dark vignette overlay on top of marquee ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--app-vignette)' }}
          />

          {/* ── Radial neon glow behind logo ── */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full"
              style={{ background: 'var(--app-splash-glow)' }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* ── Logo + text (on top of everything) ── */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center gap-5"
          >
            {/* Logo image with glow */}
            <motion.div
              className="relative w-[120px] h-[120px] flex items-center justify-center"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Glow ring behind logo */}
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{ background: 'var(--app-splash-ring)' }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [0.95, 1.1, 0.95],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <img
                src="/icons/splash-logo.png"
                alt="SubEasy"
                width={120}
                height={120}
                className="relative z-10 rounded-3xl"
                style={{ filter: 'var(--app-logo-filter)' }}
              />
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-3xl font-display font-extrabold tracking-tight neon-text"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
            >
              SubEasy
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-text-secondary text-sm font-medium"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
            >
              {lang === 'en' ? 'Subscription tracker' : 'Трекер подписок'}
            </motion.p>
          </motion.div>

          {/* ── Scanning line effect ── */}
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon/30 to-transparent z-20"
            initial={{ top: '30%' }}
            animate={{ top: '70%' }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
