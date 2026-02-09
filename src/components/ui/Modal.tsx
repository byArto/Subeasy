'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, scrollY);
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
            {/* Handle bar — drag zone */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
            >
              <div className="w-9 h-1 rounded-full bg-text-muted/40" />
            </div>

            {/* Title */}
            {title && (
              <h2 className="px-5 pb-3 text-base font-display font-semibold text-text-primary">
                {title}
              </h2>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
