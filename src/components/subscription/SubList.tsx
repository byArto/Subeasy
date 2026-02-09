'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Subscription } from '@/lib/types';
import { SubCard } from './SubCard';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SubListProps {
  subscriptions: Subscription[];
  activeCategory: string | null;
  onSubTap?: (sub: Subscription) => void;
  onAddTap?: () => void;
  className?: string;
}

export function SubList({
  subscriptions,
  activeCategory,
  onSubTap,
  onAddTap,
  className,
}: SubListProps) {
  const filtered = activeCategory
    ? subscriptions.filter((s) => s.category === activeCategory)
    : subscriptions;

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
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Подписки
        </h3>
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-xs text-text-muted">{filtered.length}</span>
      </div>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        {filtered.map((sub, i) => (
          <SubCard
            key={sub.id}
            subscription={sub}
            index={i}
            onTap={onSubTap}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function EmptyOnboarding({ onAddTap }: { onAddTap?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col items-center pt-12 pb-8 gap-5"
    >
      {/* Illustration */}
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-surface-2 border border-border-subtle flex items-center justify-center">
          <span className="text-4xl">📋</span>
        </div>
        {/* Decorative glow */}
        <div className="absolute -inset-4 rounded-[32px] bg-neon/3 blur-xl -z-10" />
      </div>

      <div className="text-center space-y-2">
        <p className="font-display font-bold text-lg text-text-primary">
          Пока пусто
        </p>
        <p className="text-text-muted text-sm max-w-[240px] leading-relaxed">
          Добавьте свою первую подписку и начните отслеживать расходы
        </p>
      </div>

      {onAddTap && (
        <Button variant="primary" size="lg" onClick={onAddTap}>
          Добавить подписку
        </Button>
      )}
    </motion.div>
  );
}
