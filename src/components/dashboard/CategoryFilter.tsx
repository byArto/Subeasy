'use client';

import { motion } from 'framer-motion';
import { Category, Subscription } from '@/lib/types';
import { cn } from '@/lib/utils';
import { soundEngine } from '@/lib/sounds';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { DEFAULT_CATEGORY_NAME_KEYS } from '@/lib/constants';

interface CategoryFilterProps {
  categories: Category[];
  subscriptions: Subscription[];
  activeCategory: string | null; // null = "Все"
  onSelect: (categoryId: string | null) => void;
  className?: string;
}

export function CategoryFilter({
  categories,
  subscriptions,
  activeCategory,
  onSelect,
  className,
}: CategoryFilterProps) {
  const { t } = useLanguage();
  const countForCategory = (catId: string) =>
    subscriptions.filter((s) => s.category === catId && s.isActive).length;

  const totalActive = subscriptions.filter((s) => s.isActive).length;

  // Only show categories that have at least one subscription
  const usedCategories = categories.filter(
    (c) => countForCategory(c.id) > 0
  );

  return (
    <div
      className={cn(
        'flex gap-2 scroll-x-contain snap-x snap-mandatory',
        'pb-1 -mx-5 px-5',
        className
      )}
    >
      {/* "All" pill */}
      <PillButton
        label={t('dashboard.filterAll')}
        count={totalActive}
        isActive={activeCategory === null}
        onTap={() => onSelect(null)}
      />

      {usedCategories.map((cat) => (
        <PillButton
          key={cat.id}
          label={DEFAULT_CATEGORY_NAME_KEYS[cat.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[cat.id]) : cat.name}
          emoji={cat.emoji}
          count={countForCategory(cat.id)}
          isActive={activeCategory === cat.id}
          onTap={() => onSelect(cat.id)}
        />
      ))}
    </div>
  );
}

function PillButton({
  label,
  emoji,
  count,
  isActive,
  onTap,
}: {
  label: string;
  emoji?: string;
  count: number;
  isActive: boolean;
  onTap: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => { soundEngine.tap(); onTap(); }}
      className={cn(
        'relative flex items-center gap-1.5 shrink-0 snap-start',
        'min-h-[36px] px-3.5 rounded-full',
        'text-xs font-semibold whitespace-nowrap',
        'transition-colors duration-150',
        isActive
          ? 'bg-neon text-surface'
          : 'bg-surface-3 text-text-secondary active:bg-surface-4'
      )}
    >
      {/* Animated background */}
      {isActive && (
        <motion.span
          layoutId="category-pill"
          className="absolute inset-0 rounded-full bg-neon"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      <span className="relative flex items-center gap-1.5">
        {emoji && <span className="text-sm">{emoji}</span>}
        {label}
        <span
          className={cn(
            'text-[10px] font-bold',
            isActive ? 'text-surface/60' : 'text-text-muted'
          )}
        >
          {count}
        </span>
      </span>
    </motion.button>
  );
}
