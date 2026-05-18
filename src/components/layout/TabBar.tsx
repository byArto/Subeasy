'use client';

import { motion } from 'framer-motion';
import {
  HomeIcon as HomeOutline,
  ChartBarIcon as ChartOutline,
  CalendarIcon as CalendarOutline,
  Cog6ToothIcon as CogOutline,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  ChartBarIcon as ChartSolid,
  CalendarIcon as CalendarSolid,
  Cog6ToothIcon as CogSolid,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';
import { useLanguage } from '@/components/providers/LanguageProvider';

export type TabId = 'home' | 'analytics' | 'calendar' | 'settings';

interface TabItem {
  id: TabId;
  labelKey: string;
  iconOutline: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { id: 'home', labelKey: 'nav.home', iconOutline: HomeOutline, iconSolid: HomeSolid },
  { id: 'analytics', labelKey: 'nav.analytics', iconOutline: ChartOutline, iconSolid: ChartSolid },
  { id: 'calendar', labelKey: 'nav.calendar', iconOutline: CalendarOutline, iconSolid: CalendarSolid },
  { id: 'settings', labelKey: 'nav.settings', iconOutline: CogOutline, iconSolid: CogSolid },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onFabTap: () => void;
  disabled?: boolean;
  className?: string;
}

export function TabBar({
  activeTab,
  onTabChange,
  onFabTap,
  disabled = false,
  className,
}: TabBarProps) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        'relative z-50 w-full shrink-0',
        disabled && 'pointer-events-none',
        className
      )}
      aria-hidden={disabled}
    >
      {/* FAB — floating above tab bar */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          onClick={() => { haptic.medium(); onFabTap(); }}
          disabled={disabled}
          className={cn(
            'flex items-center justify-center',
            'w-[56px] h-[56px] rounded-full',
            'bg-[var(--app-fab-bg)] shadow-[var(--app-fab-shadow)]',
            'active:shadow-[var(--app-fab-shadow-active)]',
            'transition-shadow duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon/30'
          )}
        >
          <PlusIcon className="w-7 h-7 text-[var(--app-fab-icon)] stroke-[2.5]" />
        </motion.button>
      </div>

      {/* Tab bar */}
      <nav
        className="glass-bg border-t border-border-subtle"
      >
        <div className="flex items-start justify-around px-2 pt-2 pb-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const Icon = isActive ? tab.iconSolid : tab.iconOutline;

            // Insert spacer for FAB in the center
            const showSpacer = index === 2;

            return (
              <div key={tab.id} className="contents">
                {showSpacer && <div className="w-[56px] shrink-0" />}

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onClick={() => { haptic.tap(); onTabChange(tab.id); }}
                  disabled={disabled}
                  className={cn(
                    'relative flex flex-col items-center justify-center',
                    'min-w-[56px] min-h-[44px] gap-0.5',
                    'rounded-lg transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon/30'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-[22px] h-[22px] transition-colors duration-150',
                      isActive ? 'text-neon' : 'text-text-muted'
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors duration-150',
                      isActive ? 'text-neon' : 'text-text-muted'
                    )}
                  >
                    {t(tab.labelKey)}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Opaque safe-area fill — prevents transparent gap on iOS PWA */}
      <div
        className="bg-surface-2"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      />
    </div>
  );
}
