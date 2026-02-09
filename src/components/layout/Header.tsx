'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  onSearchTap?: () => void;
  onNotificationTap?: () => void;
  className?: string;
}

export function Header({
  title,
  onSearchTap,
  onNotificationTap,
  className,
}: HeaderProps) {
  const { scrollY } = useScroll();
  const [collapsed, setCollapsed] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    setCollapsed(y > 40);
  });

  return (
    <motion.header
      className={cn(
        'sticky top-0 z-30 w-full',
        'pt-[env(safe-area-inset-top)]',
        className
      )}
    >
      {/* Glass background — visible when collapsed */}
      <motion.div
        animate={{
          opacity: collapsed ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 glass-bg border-b border-border-subtle"
      />

      <div className="relative flex items-end justify-between px-5">
        {/* Title */}
        <motion.h1
          animate={{
            fontSize: collapsed ? '18px' : '30px',
            paddingTop: collapsed ? '12px' : '16px',
            paddingBottom: collapsed ? '12px' : '4px',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="font-display font-extrabold text-text-primary leading-tight tracking-tight"
        >
          {title}
        </motion.h1>

        {/* Action icons */}
        <div className="flex items-center gap-1 pb-2.5">
          {onSearchTap && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onSearchTap}
              className="flex items-center justify-center w-10 h-10 rounded-full active:bg-surface-3 transition-colors"
            >
              <MagnifyingGlassIcon className="w-[22px] h-[22px] text-text-secondary" />
            </motion.button>
          )}
          {onNotificationTap && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onNotificationTap}
              className="relative flex items-center justify-center w-10 h-10 rounded-full active:bg-surface-3 transition-colors"
            >
              <BellIcon className="w-[22px] h-[22px] text-text-secondary" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
