'use client';

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Subscription } from '@/lib/types';
import { SubCard } from './SubCard';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getLogoUrl } from '@/lib/services';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { SortOption } from '@/components/dashboard/CategoryFilter';

function sortSubscriptions(subs: Subscription[], sort: SortOption): Subscription[] {
  const sorted = [...subs];
  switch (sort) {
    case 'date':
      return sorted.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    case 'added':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    default:
      return sorted;
  }
}

/* ── Component ── */

interface SubListProps {
  subscriptions: Subscription[];
  activeCategory: string | null;
  searchQuery?: string;
  sortBy?: SortOption;
  hidePaused?: boolean;
  onSubTap?: (sub: Subscription) => void;
  onMarkPaid?: (sub: Subscription) => void;
  onDelete?: (sub: Subscription) => void;
  onAddTap?: () => void;
  mostExpensiveId?: string | null;
  longestId?: string | null;
  notifyDaysBefore?: number;
  className?: string;
}

export function SubList({
  subscriptions,
  activeCategory,
  searchQuery = '',
  sortBy = 'date',
  hidePaused = false,
  onSubTap,
  onMarkPaid,
  onDelete,
  onAddTap,
  mostExpensiveId,
  longestId,
  notifyDaysBefore = 7,
  className,
}: SubListProps) {
  const { t } = useLanguage();

  const filtered = useMemo(() => {
    let result = activeCategory
      ? subscriptions.filter((s) => s.category === activeCategory)
      : subscriptions;
    if (hidePaused) {
      result = result.filter((s) => s.isActive);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    return result;
  }, [subscriptions, activeCategory, hidePaused, searchQuery]);

  const sorted = useMemo(() => sortSubscriptions(filtered, sortBy), [filtered, sortBy]);

  // Show empty state
  if (subscriptions.length === 0) {
    return <EmptyOnboarding onAddTap={onAddTap} />;
  }

  // Show "no results for filter"
  if (filtered.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center pt-12 pb-4 gap-2"
      >
        <span className="text-3xl">🔍</span>
        <p className="text-text-muted text-sm">
          {t('list.noCategory')}
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {t('list.title')}
        </h3>
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-xs text-text-muted">{sorted.length}</span>
      </div>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        {sorted.map((sub, i) => (
          <SubCard
            key={sub.id}
            subscription={sub}
            index={i}
            onTap={onSubTap}
            onMarkPaid={onMarkPaid}
            onDelete={onDelete}
            notifyDaysBefore={notifyDaysBefore}
            insightBadge={
              sub.id === mostExpensiveId
                ? 'expensive'
                : sub.id === longestId
                  ? 'longest'
                  : null
            }
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

const QUICK_START_SERVICES = [
  { name: 'YouTube', emoji: '▶️', color: '#FF0000', domain: 'youtube.com' },
  { name: 'Spotify', emoji: '🎵', color: '#1DB954', domain: 'spotify.com' },
  { name: 'Netflix', emoji: '📺', color: '#E50914', domain: 'netflix.com' },
  { name: 'ChatGPT', emoji: '🤖', color: '#10A37F', domain: 'openai.com' },
  { name: 'Telegram', emoji: '✈️', color: '#2AABEE', domain: 'telegram.org' },
  { name: 'iCloud', emoji: '☁️', color: '#3395FF', domain: 'icloud.com' },
];

function ServiceIcon({ domain, emoji, name, size = 20 }: { domain: string; emoji: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: size * 0.6 }}>{emoji}</span>;
  return (
    <img
      src={getLogoUrl(domain, size >= 40 ? 128 : 64)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="rounded-sm object-contain"
    />
  );
}

function EmptyOnboarding({ onAddTap }: { onAddTap?: () => void }) {
  const { t } = useLanguage();
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCarouselIdx((i) => (i + 1) % QUICK_START_SERVICES.length), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col items-center pt-10 pb-8 gap-5 px-2"
    >
      {/* Logo carousel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-border-subtle overflow-hidden flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={carouselIdx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.35 }}
              className="flex items-center justify-center w-full h-full"
            >
              <ServiceIcon
                domain={QUICK_START_SERVICES[carouselIdx].domain}
                emoji={QUICK_START_SERVICES[carouselIdx].emoji}
                name={QUICK_START_SERVICES[carouselIdx].name}
                size={48}
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute -inset-4 rounded-[28px] bg-neon/5 blur-xl -z-10" />
      </motion.div>

      {/* Title only (no subtitle) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 30 }}
        className="text-center"
      >
        <p className="font-display font-bold text-lg text-text-primary">
          {t('empty.title')}
        </p>
      </motion.div>

      {/* Quick-start service chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full"
      >
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest text-center mb-3">
          {t('empty.popularServices')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_START_SERVICES.map((svc, i) => (
            <motion.button
              key={svc.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              whileTap={{ scale: 0.93 }}
              onClick={onAddTap}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border-subtle active:bg-surface-3 transition-colors"
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs overflow-hidden"
                style={{ backgroundColor: `${svc.color}20` }}
              >
                <ServiceIcon domain={svc.domain} emoji={svc.emoji} name={svc.name} />
              </span>
              <span className="text-xs font-medium text-text-secondary">{svc.name}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      {onAddTap && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 30 }}
        >
          <Button variant="primary" size="lg" onClick={onAddTap}>
            {t('empty.addButton')}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
