'use client';

import { motion } from 'framer-motion';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/components/providers/TelegramProvider';

interface HeaderProps {
  title: string;
  collapsed?: boolean;
  onSearchTap?: () => void;
  onNotificationTap?: () => void;
  notificationCount?: number;
  hasDanger?: boolean;
  className?: string;
}

export function Header({
  title,
  collapsed = false,
  onSearchTap,
  onNotificationTap,
  notificationCount = 0,
  hasDanger = false,
  className,
}: HeaderProps) {
  const { isTelegram, safeAreaTop } = useTelegramContext();

  return (
    <motion.header
      // In Telegram fullscreen mode, use the exact pixel value from contentSafeAreaInset
      // so content sits perfectly below the Telegram header bar.
      // Outside Telegram, use CSS env() for the device notch/status bar.
      style={isTelegram ? { paddingTop: safeAreaTop } : undefined}
      className={cn(
        'relative z-50 w-full shrink-0',
        !isTelegram && 'pt-[env(safe-area-inset-top)]',
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
              {notificationCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1',
                    'flex items-center justify-center',
                    'bg-danger rounded-full',
                    'text-[10px] font-bold text-white leading-none',
                    hasDanger && 'animate-pulse',
                  )}
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
