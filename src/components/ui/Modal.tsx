'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type ModalSize = 'compact' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const sizeStyles: Record<ModalSize, string> = {
  compact: 'max-h-[50dvh]',
  full: 'max-h-[90dvh]',
};

export function Modal({
  open,
  onClose,
  size = 'full',
  title,
  children,
  className,
}: ModalProps) {
  const dragControls = useDragControls();

  // Block main content scroll when modal is open
  useEffect(() => {
    if (!open) return;

    const mainEl = document.querySelector('.scrollable-content') as HTMLElement | null;
    if (mainEl) {
      mainEl.style.overflow = 'hidden';
    }

    return () => {
      if (mainEl) {
        mainEl.style.overflow = '';
      }
    };
  }, [open]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // Close if dragged down more than 100px or with enough velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'mx-auto max-w-[430px]',
              'bg-surface-2 rounded-t-2xl',
              'border-t border-x border-border-subtle',
              'flex flex-col',
              'pb-[env(safe-area-inset-bottom)]',
              sizeStyles[size],
              className
            )}
          >
            {/* Handle bar with close button */}
            <div className="relative flex items-center justify-center pt-3 pb-2">
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex-1 flex justify-center cursor-grab active:cursor-grabbing py-1"
              >
                <div className="w-9 h-1 rounded-full bg-text-muted/40" />
              </div>
              <button
                onClick={onClose}
                className="absolute right-3 top-1 p-1.5 rounded-full text-text-muted active:text-text-primary active:bg-surface-3 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Title */}
            {title && (
              <h2 className="px-5 pb-3 text-base font-display font-semibold text-text-primary">
                {title}
              </h2>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-5 touch-pan-y">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
