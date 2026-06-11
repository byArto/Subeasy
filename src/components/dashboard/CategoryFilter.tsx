'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Category, Subscription } from '@/lib/types';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
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

type Panel = 'search' | 'category' | 'sort' | null;

interface ListFiltersProps {
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
}

/**
 * Compact filter controls that sit at the right of the "Subscriptions" section
 * header: a search icon + Category and Sort buttons, each opening a dropdown
 * below. Only one panel open at a time; tap outside closes.
 */
export function ListFilters({
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
}: ListFiltersProps) {
  const { t } = useLanguage();
  const [panel, setPanel] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!panel) return;
    const onDoc = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [panel]);

  useEffect(() => {
    if (panel === 'search') setTimeout(() => searchInputRef.current?.focus(), 80);
  }, [panel]);

  const toggle = (p: Exclude<Panel, null>) => {
    haptic.tap();
    setPanel((cur) => (cur === p ? null : p));
  };

  const countForCategory = (catId: string) =>
    subscriptions.filter((s) => s.category === catId && s.isActive).length;
  const totalActive = subscriptions.filter((s) => s.isActive).length;
  const usedCategories = categories.filter((c) => countForCategory(c.id) > 0);

  const categoryActive = activeCategory !== null;
  const searchActive = searchQuery.trim() !== '';
  const sortActive = sortBy !== 'date';

  const activeCatLabel = (() => {
    if (!activeCategory) return null;
    const cat = categories.find((c) => c.id === activeCategory);
    if (!cat) return null;
    return DEFAULT_CATEGORY_NAME_KEYS[cat.id] ? t(DEFAULT_CATEGORY_NAME_KEYS[cat.id]) : cat.name;
  })();

  return (
    <div ref={ref} className="relative flex items-center gap-1.5 shrink-0">
      <FilterIconButton active={searchActive} open={panel === 'search'} onClick={() => toggle('search')}>
        <MagnifyingGlassIcon className="w-4 h-4" />
      </FilterIconButton>

      <FilterButton active={categoryActive} open={panel === 'category'} onClick={() => toggle('category')}>
        <Squares2X2Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[88px]">
          {categoryActive && activeCatLabel ? activeCatLabel : t('dashboard.categories')}
        </span>
        <ChevronDownIcon className={cn('w-3 h-3 shrink-0 transition-transform', panel === 'category' && 'rotate-180')} />
      </FilterButton>

      <FilterButton active={sortActive} open={panel === 'sort'} onClick={() => toggle('sort')}>
        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5 shrink-0" />
        <ChevronDownIcon className={cn('w-3 h-3 shrink-0 transition-transform', panel === 'sort' && 'rotate-180')} />
      </FilterButton>

      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-2 z-40 w-[min(280px,calc(100vw-32px))] rounded-2xl bg-surface-2 border border-border-subtle shadow-xl p-3"
          >
            {panel === 'search' && (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t('dashboard.searchPlaceholder')}
                  className={cn(
                    'w-full min-h-[40px] pl-9 pr-9 rounded-xl bg-surface-3 border border-border-subtle',
                    'text-sm text-text-primary outline-none placeholder:text-text-muted/50',
                    'focus:border-neon/40 focus:shadow-[var(--app-input-focus-shadow)]',
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
            )}

            {panel === 'category' && (
              <div className="space-y-3">
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
                {pausedCount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <span className="text-xs text-text-secondary">
                      {t('list.hidePaused')}
                      <span className="ml-1 text-text-muted">({pausedCount})</span>
                    </span>
                    <button
                      onClick={() => onHidePausedChange(!hidePaused)}
                      className={cn('relative w-9 h-5 rounded-full transition-colors', hidePaused ? 'bg-neon' : 'bg-surface-4')}
                    >
                      <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', hidePaused && 'translate-x-4')} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {panel === 'sort' && (
              <div className="flex flex-col gap-0.5">
                {SORT_OPTION_KEYS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { haptic.tap(); onSortChange(opt.value); setPanel(null); }}
                    className={cn(
                      'flex items-center justify-between min-h-[40px] px-3 rounded-xl text-sm transition-colors',
                      sortBy === opt.value ? 'bg-neon/10 text-neon font-semibold' : 'text-text-secondary active:bg-surface-3',
                    )}
                  >
                    {t(opt.labelKey)}
                    {sortBy === opt.value && <CheckIcon className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterButton({
  active,
  open,
  onClick,
  children,
}: {
  active: boolean;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 min-h-[30px] px-2.5 rounded-full text-[11px] font-semibold transition-colors',
        active || open
          ? 'bg-neon/10 text-neon border border-neon/30'
          : 'bg-surface-3 text-text-secondary border border-transparent active:bg-surface-4',
      )}
    >
      {children}
    </motion.button>
  );
}

function FilterIconButton({
  active,
  open,
  onClick,
  children,
}: {
  active: boolean;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label="Поиск"
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-[30px] h-[30px] rounded-full transition-colors',
        active || open
          ? 'bg-neon/10 text-neon border border-neon/30'
          : 'bg-surface-3 text-text-secondary border border-transparent active:bg-surface-4',
      )}
    >
      {children}
    </motion.button>
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
      onClick={onTap}
      className={cn(
        'flex items-center gap-1.5 shrink-0 min-h-[32px] px-3 rounded-full',
        'text-xs font-semibold whitespace-nowrap transition-colors duration-150',
        isActive ? 'bg-neon text-surface' : 'bg-surface-3 text-text-secondary active:bg-surface-4',
      )}
    >
      {emoji && <span className="text-sm">{emoji}</span>}
      {label}
      <span className={cn('text-[10px] font-bold', isActive ? 'text-surface/60' : 'text-text-muted')}>{count}</span>
    </motion.button>
  );
}
