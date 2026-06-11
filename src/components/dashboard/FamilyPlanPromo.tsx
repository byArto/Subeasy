'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { haptic } from '@/lib/haptic';

const DISMISS_KEY = 'neonsub-family-promo-dismissed';

/**
 * Slim, dismissible promo for the Family Plan on the home screen. Surfaces a
 * feature that was previously buried in Settings. Hidden once the user has a
 * workspace or dismisses it. Full management still lives in Settings.
 */
export function FamilyPlanPromo({ onOpen }: { onOpen: () => void }) {
  const { workspace } = useWorkspace();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DISMISS_KEY) === 'true';
  });

  if (workspace || dismissed) return null;

  const dismiss = () => {
    haptic.tap();
    try { window.localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl border border-neon/25 bg-neon/5 p-4"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('common.close')}
        className="absolute top-2.5 right-2.5 text-text-muted active:text-text-secondary"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-5">
        <div className="w-10 h-10 rounded-xl bg-neon/15 flex items-center justify-center shrink-0">
          <UserGroupIcon className="w-5 h-5 text-neon" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{t('family.promo.title')}</p>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t('family.promo.desc')}</p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => { haptic.tap(); onOpen(); }}
            className="mt-2.5 inline-flex items-center gap-1.5 min-h-[34px] px-3.5 rounded-full bg-neon text-surface text-xs font-semibold"
          >
            {t('family.promo.cta')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
