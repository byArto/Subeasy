'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { AppMode } from '@/lib/obligations';

const ICON: Record<AppMode, string> = {
  subscriptions: '🔁',
  credits: '💳',
  mortgages: '🏦',
};

const LABEL_KEY: Record<AppMode, string> = {
  subscriptions: 'mode.subscriptions',
  credits: 'mode.credits',
  mortgages: 'mode.mortgages',
};

interface ModeSwitchProps {
  modes: AppMode[];
  active: AppMode;
  onChange: (m: AppMode) => void;
}

export function ModeSwitch({ modes, active, onChange }: ModeSwitchProps) {
  const { t } = useLanguage();
  if (modes.length < 2) return null;

  return (
    <div className="flex gap-2 px-5 pt-1 pb-2 overflow-x-auto">
      {modes.map((m) => {
        const isActive = m === active;
        return (
          <motion.button
            key={m}
            type="button"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => { haptic.tap(); onChange(m); }}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors',
              isActive
                ? 'bg-neon text-surface shadow-neon'
                : 'bg-surface-2 border border-border-subtle text-text-secondary',
            )}
          >
            <span className="text-sm">{ICON[m]}</span>
            {t(LABEL_KEY[m])}
          </motion.button>
        );
      })}
    </div>
  );
}
