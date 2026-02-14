'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Subscription } from '@/lib/types';
import { SubCard } from './SubCard';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ── Sort types ── */

type SortOption = 'date' | 'price-desc' | 'price-asc' | 'name' | 'added';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date', label: 'По дате' },
  { value: 'price-desc', label: 'Цена ↓' },
  { value: 'price-asc', label: 'Цена ↑' },
  { value: 'name', label: 'Имя' },
  { value: 'added', label: 'Новые' },
];

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
  onSubTap?: (sub: Subscription) => void;
  onAddTap?: () => void;
  mostExpensiveId?: string | null;
  longestId?: string | null;
  className?: string;
}

export function SubList({
  subscriptions,
  activeCategory,
  onSubTap,
  onAddTap,
  mostExpensiveId,
  longestId,
  className,
}: SubListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSort, setShowSort] = useState(false);
  const [hidePaused, setHidePaused] = useState(false);

  const filtered = useMemo(() => {
    let result = activeCategory
      ? subscriptions.filter((s) => s.category === activeCategory)
      : subscriptions;
    if (hidePaused) {
      result = result.filter((s) => s.isActive);
    }
    return result;
  }, [subscriptions, activeCategory, hidePaused]);

  const pausedCount = useMemo(
    () => subscriptions.filter((s) => !s.isActive).length,
    [subscriptions]
  );

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
          Нет подписок в этой категории
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Section header with sort */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Подписки
        </h3>
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-xs text-text-muted mr-1">{sorted.length}</span>
        {pausedCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setHidePaused((p) => !p)}
            className={cn(
              'text-[11px] font-medium px-2 py-1 rounded-lg transition-colors',
              hidePaused
                ? 'text-neon bg-neon/10'
                : 'text-text-muted active:text-text-secondary'
            )}
          >
            {hidePaused ? `+${pausedCount} скрыто` : 'Скрыть паузу'}
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSort((p) => !p)}
          className={cn(
            'text-[11px] font-medium px-2 py-1 rounded-lg transition-colors',
            showSort
              ? 'text-neon bg-neon/10'
              : 'text-text-muted active:text-text-secondary'
          )}
        >
          {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Сорт.'}
        </motion.button>
      </div>

      {/* Sort pills */}
      <AnimatePresence>
        {showSort && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 pb-1">
              {SORT_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => {
                    setSortBy(opt.value);
                    setShowSort(false);
                  }}
                  className={cn(
                    'min-h-[32px] px-3 rounded-full text-[11px] font-semibold transition-colors',
                    sortBy === opt.value
                      ? 'bg-neon text-surface'
                      : 'bg-surface-2 border border-border-subtle text-text-secondary active:bg-surface-4'
                  )}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        {sorted.map((sub, i) => (
          <SubCard
            key={sub.id}
            subscription={sub}
            index={i}
            onTap={onSubTap}
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
  { name: 'YouTube', emoji: '▶️', color: '#FF0000' },
  { name: 'Spotify', emoji: '🎵', color: '#1DB954' },
  { name: 'Netflix', emoji: '📺', color: '#E50914' },
  { name: 'ChatGPT', emoji: '🤖', color: '#10A37F' },
  { name: 'Telegram', emoji: '✈️', color: '#2AABEE' },
  { name: 'iCloud', emoji: '☁️', color: '#3395FF' },
];

function EmptyOnboarding({ onAddTap }: { onAddTap?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col items-center pt-10 pb-8 gap-5 px-2"
    >
      {/* Icon with glow */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center">
          <span className="text-4xl">💎</span>
        </div>
        <div className="absolute -inset-4 rounded-[28px] bg-neon/5 blur-xl -z-10" />
      </motion.div>

      {/* Title + description */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 30 }}
        className="text-center space-y-2"
      >
        <p className="font-display font-bold text-lg text-text-primary">
          Начните отслеживать
        </p>
        <p className="text-text-muted text-sm max-w-[260px] leading-relaxed">
          Добавьте подписки, чтобы видеть расходы, получать напоминания и контролировать бюджет
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
          Популярные сервисы
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
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                style={{ backgroundColor: `${svc.color}20` }}
              >
                {svc.emoji}
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
            Добавить подписку
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
