'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выбрать...',
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside tap
  useEffect(() => {
    if (!open) return;

    const handleTouch = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleTouch);
    return () => document.removeEventListener('pointerdown', handleTouch);
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Label */}
      <span className="block mb-1.5 text-xs text-text-secondary pl-1">
        {label}
      </span>

      {/* Trigger */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          'w-full flex items-center justify-between',
          'min-h-[48px] px-3.5 rounded-xl',
          'bg-surface-2 border transition-all duration-200',
          'text-sm text-left',
          open
            ? 'border-neon/40 shadow-[0_0_12px_rgba(0,255,65,0.1)]'
            : 'border-border-subtle'
        )}
      >
        <span
          className={cn(
            selected ? 'text-text-primary' : 'text-text-muted'
          )}
        >
          {selected ? (
            <>
              {selected.emoji && (
                <span className="mr-2">{selected.emoji}</span>
              )}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className="w-4 h-4 text-text-muted" />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className={cn(
              'absolute z-50 left-0 right-0 mt-1.5',
              'bg-surface-3 border border-border-subtle rounded-xl',
              'shadow-card overflow-hidden',
              'max-h-[240px] overflow-y-auto'
            )}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <motion.button
                  key={option.value}
                  type="button"
                  whileTap={{ scale: 0.98, backgroundColor: 'rgba(0, 255, 65, 0.06)' }}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center min-h-[44px] px-3.5 gap-3',
                    'text-sm text-left transition-colors',
                    isSelected
                      ? 'text-neon bg-neon/5'
                      : 'text-text-primary active:bg-surface-4'
                  )}
                >
                  {option.emoji && (
                    <span className="text-base shrink-0">{option.emoji}</span>
                  )}
                  <span className="flex-1">{option.label}</span>
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-neon shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
