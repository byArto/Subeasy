'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Subscription } from '@/lib/types';
import { SubCard } from '@/components/subscription/SubCard';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTelegramContext } from '@/components/providers/TelegramProvider';

interface SearchPanelProps {
  open: boolean;
  subscriptions: Subscription[];
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSelectSubscription: (sub: Subscription) => void;
}

export function SearchPanel({
  open,
  subscriptions,
  onClose,
  onSelectSubscription,
}: SearchPanelProps) {
  const { t } = useLanguage();
  const { isTelegram, safeAreaTop } = useTelegramContext();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [open]);

  const results = query.trim()
    ? subscriptions.filter((sub) => {
        const q = query.toLowerCase();
        return sub.name.toLowerCase().includes(q);
      })
    : [];

  const handleSelect = (sub: Subscription) => {
    onClose();
    onSelectSubscription(sub);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={isTelegram ? { paddingTop: safeAreaTop } : undefined}
            className={cn(
              'fixed top-0 left-0 right-0 z-50',
              'mx-auto max-w-[430px]',
              'bg-surface-2 rounded-b-2xl',
              'border-b border-x border-border-subtle',
              !isTelegram && 'pt-[env(safe-area-inset-top)]',
              'max-h-[80dvh] flex flex-col',
            )}
          >
            {/* Search bar */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-3">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl',
                    'bg-surface-3 text-text-primary text-sm',
                    'border border-transparent',
                    'focus:border-neon/40 focus:outline-none',
                    'placeholder:text-text-muted',
                    'transition-colors',
                  )}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-sm font-medium text-text-secondary px-2 py-2 shrink-0"
              >
                {t('search.cancel')}
              </motion.button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4">
              {query.trim() === '' ? (
                <p className="text-center text-xs text-text-muted py-6">
                  {t('search.hint')}
                </p>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <span className="text-2xl">🔍</span>
                  <p className="text-sm text-text-muted">{t('search.notFound')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2 pl-1">
                    {t('search.found', { count: results.length })}
                  </p>
                  <AnimatePresence mode="popLayout">
                    {results.map((sub, i) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <SubCard subscription={sub} onTap={handleSelect} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
