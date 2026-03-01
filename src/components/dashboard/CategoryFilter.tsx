'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Category, Subscription } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { DEFAULT_CATEGORY_NAME_KEYS } from '@/lib/constants';

export type SortOption = 'date' | 'price-desc' | 'price-asc' | 'name' | 'added';

export const SORT_OPTION_KEYS: { value: SortOption; labelKey: string }[] = [
  { value: 'date', labelKey: 'list.sort.date' },
  { value: 'price-desc', labelKey: 'list.sort.priceDesc' },
  { value: 'price-asc', labelKey: 'list.sort.priceAsc' },
  { value: 'name', labelKey: 'list.sort.name' },
  { value: 'added', labelKey: 'list.sort.added' },
];

interface CategoryFilterProps {
  categories: Category[];
  subscriptions: Subscription[];
  activeCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (s: SortOption) => void;
  hidePaused: boolean;
  onHidePausedChange: (v: boolean) => void;
  pausedCount: number;
  className?: string;
}

export function CategoryFilter({
  categories,
  subscriptions,
  activeCategory,
  onSelect,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  hidePaused,
  onHidePausedChange,
  pausedCount,
  className,
}: CategoryFilterProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const countForCategory = (catId: string) =>
    subscriptions.filter((s) => s.category === catId && s.isActive).length;

  const totalActive = subscriptions.filter((s) => s.isActive).length;

  const usedCategories = categories.filter((c) => countForCategory(c.id) > 0);

  const hasActiveFilter =
    activeCategory !== null ||
    searchQuery.trim() !== '' ||
    sortBy !== 'date' ||
    hidePaused;

  const currentSortLabel = SORT_OPTION_KEYS.find((o) => o.value === sortBy);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Trigger row */}
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => { setIsOpen((p) => !p); }}
          className={cn(
            'flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-full text-xs font-semibold transition-colors',
            isOpen || hasActiveFilter
              ? 'bg-neon/10 text-neon border border-neon/30'
              : 'bg-surface-3 text-text-secondary active:bg-surface-4'
          )}
        >
          <MagnifyingGlassIcon className="w-3.5 h-3.5" />
          {t('dashboard.searchFilter')}
          <ChevronDownIcon
            className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </motion.button>

        {/* Active filter chips */}
        {!isOpen && (
          <div className="flex gap-1.5 flex-1 overflow-hidden">
            {activeCategory !== null && (
              <ActiveChip
                label={(() => {
                  const cat = categories.find((c) => c.id === activeCategory);
                  if (!cat) return activeCategory;
                  return `${cat.emoji} ${DEFAULT_CATEGORY_NAME_KEYS[cat.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[cat.id]) : cat.name}`;
                })()}
                onRemove={() => onSelect(null)}
              />
            )}
            {searchQuery.trim() !== '' && (
              <ActiveChip label={`"${searchQuery}"`} onRemove={() => onSearchChange('')} />
            )}
            {sortBy !== 'date' && currentSortLabel && (
              <ActiveChip label={t(currentSortLabel.labelKey)} onRemove={() => onSortChange('date')} />
            )}
          </div>
        )}
      </div>

      {/* Expandable panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 bg-surface-2 rounded-2xl border border-border-subtle">
              {/* Search input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t('dashboard.searchPlaceholder')}
                  className={cn(
                    'w-full min-h-[40px] pl-9 pr-3.5 rounded-xl bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary outline-none placeholder:text-text-muted/50',
                    'focus:border-neon/40 focus:shadow-[0_0_12px_rgba(0,255,65,0.08)]'
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted active:text-text-primary"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Categories */}
              {usedCategories.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">
                    {t('dashboard.categories')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
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
                </div>
              )}

              {/* Sort */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-2">
                  {t('dashboard.sorting')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTION_KEYS.map((opt) => (
                    <motion.button
                      key={opt.value}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => { onSortChange(opt.value); }}
                      className={cn(
                        'min-h-[32px] px-3 rounded-full text-[11px] font-semibold transition-colors',
                        sortBy === opt.value
                          ? 'bg-neon text-surface'
                          : 'bg-surface-3 border border-border-subtle text-text-secondary active:bg-surface-4'
                      )}
                    >
                      {t(opt.labelKey)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Hide paused */}
              {pausedCount > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                  <span className="text-xs text-text-secondary">
                    {t('list.hidePaused')}
                    <span className="ml-1 text-text-muted">({pausedCount})</span>
                  </span>
                  <button
                    onClick={() => onHidePausedChange(!hidePaused)}
                    className={cn(
                      'relative w-9 h-5 rounded-full transition-colors',
                      hidePaused ? 'bg-neon' : 'bg-surface-4'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                        hidePaused && 'translate-x-4'
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      onClick={() => { onTap(); }}
      className={cn(
        'relative flex items-center gap-1.5 shrink-0',
        'min-h-[32px] px-3 rounded-full',
        'text-xs font-semibold whitespace-nowrap',
        'transition-colors duration-150',
        isActive
          ? 'bg-neon text-surface'
          : 'bg-surface-3 text-text-secondary active:bg-surface-4'
      )}
    >
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
        <span className={cn('text-[10px] font-bold', isActive ? 'text-surface/60' : 'text-text-muted')}>
          {count}
        </span>
      </span>
    </motion.button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neon/10 border border-neon/20 text-neon text-[11px] font-medium shrink-0 max-w-[120px]">
      <span className="truncate">{label}</span>
      <button onClick={onRemove} className="shrink-0">
        <XMarkIcon className="w-3 h-3" />
      </button>
    </span>
  );
}
