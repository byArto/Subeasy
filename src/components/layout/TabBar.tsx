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
import { soundEngine } from '@/lib/sounds';

export type TabId = 'home' | 'analytics' | 'calendar' | 'settings';

interface TabItem {
  id: TabId;
  label: string;
  iconOutline: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { id: 'home', label: 'Главная', iconOutline: HomeOutline, iconSolid: HomeSolid },
  { id: 'analytics', label: 'Аналитика', iconOutline: ChartOutline, iconSolid: ChartSolid },
  { id: 'calendar', label: 'Календарь', iconOutline: CalendarOutline, iconSolid: CalendarSolid },
  { id: 'settings', label: 'Настройки', iconOutline: CogOutline, iconSolid: CogSolid },
];

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onFabTap: () => void;
  className?: string;
}

export function TabBar({
  activeTab,
  onTabChange,
  onFabTap,
  className,
}: TabBarProps) {
  return (
    <div
      className={cn(
        'relative z-50 w-full shrink-0',
        className
      )}
    >
      {/* FAB — floating above tab bar */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          onClick={() => { soundEngine.tap(); onFabTap(); }}
          className={cn(
            'flex items-center justify-center',
            'w-[56px] h-[56px] rounded-full',
            'bg-neon shadow-neon-strong',
            'active:shadow-[0_0_30px_rgba(0,255,65,0.5)]',
            'transition-shadow duration-150'
          )}
        >
          <PlusIcon className="w-7 h-7 text-surface stroke-[2.5]" />
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
                  onClick={() => { soundEngine.tabSwitch(); onTabChange(tab.id); }}
                  className={cn(
                    'relative flex flex-col items-center justify-center',
                    'min-w-[56px] min-h-[44px] gap-0.5',
                    'transition-colors duration-150'
                  )}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute -top-1 w-1 h-1 rounded-full bg-neon shadow-[0_0_6px_rgba(0,255,65,0.6)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

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
                    {tab.label}
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
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      />
    </div>
  );
}
