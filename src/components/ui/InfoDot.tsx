'use client';

import { useState, useRef, useEffect } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

interface InfoDotProps {
  /** Help text shown in the popover bubble. */
  text: string;
  /** Which edge the bubble aligns to (avoid overflow near screen edges). */
  align?: 'left' | 'right';
  /** Icon size in px. */
  size?: number;
  className?: string;
}

/**
 * A small "?" in a circle. Tapping it toggles a help bubble (mobile-first — tap,
 * not hover). Tap outside or tap again to close. Stops propagation so it never
 * triggers a parent card/row tap.
 */
export function InfoDot({ text, align = 'left', size = 18, className }: InfoDotProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [open]);

  return (
    <span ref={ref} className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label="Подсказка"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          haptic.tap();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center justify-center text-text-muted/60 active:text-text-secondary transition-colors"
      >
        <QuestionMarkCircleIcon style={{ width: size, height: size }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full mt-1.5 z-50 block w-max max-w-[230px] rounded-xl px-3 py-2',
              'bg-surface-3 border border-border-subtle shadow-lg',
              'text-[12px] leading-snug font-normal text-text-secondary normal-case tracking-normal text-left whitespace-normal',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
