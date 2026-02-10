'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { TabBar, TabId } from '@/components/layout/TabBar';
import { Modal } from '@/components/ui';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CategoryFilter } from '@/components/dashboard/CategoryFilter';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { SubList } from '@/components/subscription/SubList';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { useSettings } from '@/hooks/useSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { SplashScreen } from '@/components/SplashScreen';
import { useSound } from '@/hooks/useSound';
import { Subscription } from '@/lib/types';

/* ── Lazy-loaded heavy components ── */
const SubForm = dynamic(() =>
  import('@/components/subscription/SubForm').then((m) => ({ default: m.SubForm })),
  { ssr: false }
);
const SubDetail = dynamic(() =>
  import('@/components/subscription/SubDetail').then((m) => ({ default: m.SubDetail })),
  { ssr: false }
);
const SettingsPage = dynamic(() =>
  import('@/components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
  { ssr: false }
);

const TAB_ORDER: TabId[] = ['home', 'analytics', 'calendar', 'settings'];

const tabTitles: Record<TabId, string> = {
  home: 'Подписки',
  analytics: 'Аналитика',
  calendar: 'Календарь',
  settings: 'Настройки',
};

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const prevIndex = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // Track scroll position for header collapse
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setHeaderCollapsed(el.scrollTop > 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [splashDone]);

  // Shared hooks
  const {
    subscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getTotalMonthly,
    getTotalYearly,
    getActiveSubscriptions,
    getUpcomingPayments,
  } = useSubscriptions();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { settings, updateSettings, toggleCurrency, setExchangeRate } = useSettings();

  const { playSuccess, playDelete } = useSound();

  // Notifications — auto-registers SW + schedules reminders
  useNotifications(subscriptions, settings);

  const currentIndex = TAB_ORDER.indexOf(activeTab);
  const direction = currentIndex > prevIndex.current ? 1 : -1;

  const handleTabChange = useCallback((tab: TabId) => {
    prevIndex.current = TAB_ORDER.indexOf(activeTab);
    setActiveTab(tab);
  }, [activeTab]);

  const openAdd = useCallback(() => setShowAddModal(true), []);
  const closeAdd = useCallback(() => setShowAddModal(false), []);
  const openDetail = useCallback((sub: Subscription) => setSelectedSubId(sub.id), []);
  const closeDetail = useCallback(() => setSelectedSubId(null), []);
  const closeEdit = useCallback(() => setEditingSubId(null), []);

  // Memoized subscription lookups for modals
  const selectedSub = useMemo(
    () => (selectedSubId ? subscriptions.find((s) => s.id === selectedSubId) : undefined),
    [selectedSubId, subscriptions]
  );
  const editingSub = useMemo(
    () => (editingSubId ? subscriptions.find((s) => s.id === editingSubId) : undefined),
    [editingSubId, subscriptions]
  );

  // Splash screen
  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-surface to-[#07070C]">
      <Header
        title={tabTitles[activeTab]}
        collapsed={headerCollapsed}
        onSearchTap={activeTab === 'home' ? () => {} : undefined}
        onNotificationTap={activeTab === 'home' ? () => {} : undefined}
      />

      <main ref={mainRef} className="flex-1 scrollable-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="pb-20"
          >
            {activeTab === 'home' && (
              <HomeTab
                subscriptions={subscriptions}
                categories={categories}
                settings={settings}
                getTotalMonthly={getTotalMonthly}
                getTotalYearly={getTotalYearly}
                getActiveSubscriptions={getActiveSubscriptions}
                getUpcomingPayments={getUpcomingPayments}
                onAddTap={openAdd}
                onSubTap={openDetail}
              />
            )}
            {activeTab === 'analytics' && <PlaceholderTab emoji="📊" label="Аналитика" />}
            {activeTab === 'calendar' && <PlaceholderTab emoji="📅" label="Календарь" />}
            {activeTab === 'settings' && (
              <SettingsPage
                settings={settings}
                updateSettings={updateSettings}
                toggleCurrency={toggleCurrency}
                setExchangeRate={setExchangeRate}
                categories={categories}
                addCategory={addCategory}
                updateCategory={updateCategory}
                deleteCategory={deleteCategory}
                subscriptions={subscriptions}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onFabTap={openAdd}
      />

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={closeAdd}
        title="Новая подписка"
      >
        <SubForm
          mode="add"
          categories={categories}
          onSubmit={(data) => {
            addSubscription(data);
            playSuccess();
            closeAdd();
          }}
          onAddCategory={addCategory}
          onClose={closeAdd}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!selectedSubId}
        onClose={closeDetail}
        title={selectedSub?.name}
        size="full"
      >
        {selectedSub && (
          <SubDetail
            subscription={selectedSub}
            category={categories.find((c) => c.id === selectedSub.category)}
            settings={settings}
            onClose={closeDetail}
            onEdit={() => {
              setEditingSubId(selectedSubId);
              setSelectedSubId(null);
            }}
            onToggleActive={() => {
              updateSubscription(selectedSub.id, { isActive: !selectedSub.isActive });
            }}
            onDelete={() => {
              deleteSubscription(selectedSub.id);
              playDelete();
              closeDetail();
            }}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingSubId}
        onClose={closeEdit}
        title="Редактирование"
      >
        {editingSub && (
          <SubForm
            mode="edit"
            initialData={editingSub}
            categories={categories}
            onSubmit={(data) => {
              updateSubscription(editingSubId!, data);
              playSuccess();
              closeEdit();
            }}
            onDelete={() => {
              deleteSubscription(editingSubId!);
              playDelete();
              closeEdit();
            }}
            onAddCategory={addCategory}
            onClose={closeEdit}
          />
        )}
      </Modal>
    </div>
  );
}

/* ── Home Tab ── */
function HomeTab({
  subscriptions,
  categories,
  settings,
  getTotalMonthly,
  getTotalYearly,
  getActiveSubscriptions,
  getUpcomingPayments,
  onAddTap,
  onSubTap,
}: {
  subscriptions: Subscription[];
  categories: import('@/lib/types').Category[];
  settings: import('@/lib/types').AppSettings;
  getTotalMonthly: (c: import('@/lib/types').DisplayCurrency, r: number) => number;
  getTotalYearly: (c: import('@/lib/types').DisplayCurrency, r: number) => number;
  getActiveSubscriptions: () => Subscription[];
  getUpcomingPayments: (days: number) => Subscription[];
  onAddTap: () => void;
  onSubTap: (sub: Subscription) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { displayCurrency, exchangeRate } = settings;
  const totalMonthly = useMemo(
    () => getTotalMonthly(displayCurrency, exchangeRate),
    [getTotalMonthly, displayCurrency, exchangeRate]
  );
  const totalYearly = useMemo(
    () => getTotalYearly(displayCurrency, exchangeRate),
    [getTotalYearly, displayCurrency, exchangeRate]
  );
  const active = useMemo(() => getActiveSubscriptions(), [getActiveSubscriptions]);
  const upcoming = useMemo(() => getUpcomingPayments(7), [getUpcomingPayments]);

  const hasSubscriptions = subscriptions.length > 0;

  return (
    <div className="space-y-5 px-5 pt-2">
      {/* Summary */}
      {hasSubscriptions && (
        <SummaryCards
          totalMonthly={totalMonthly}
          totalYearly={totalYearly}
          activeCount={active.length}
          upcomingSoonCount={upcoming.length}
          currency={displayCurrency}
        />
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <UpcomingPayments
          subscriptions={upcoming}
          currency={displayCurrency}
        />
      )}

      {/* Category filter */}
      {hasSubscriptions && (
        <CategoryFilter
          categories={categories}
          subscriptions={subscriptions}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      )}

      {/* Sub list */}
      <SubList
        subscriptions={subscriptions}
        activeCategory={activeCategory}
        onSubTap={onSubTap}
        onAddTap={onAddTap}
      />
    </div>
  );
}

/* ── Placeholder ── */
function PlaceholderTab({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-32 px-5 gap-3">
      <span className="text-5xl">{emoji}</span>
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <p className="text-text-muted text-xs">Скоро будет</p>
    </div>
  );
}
