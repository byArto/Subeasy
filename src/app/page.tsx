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
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Subscription, Currency } from '@/lib/types';
import { getMonthlyPrice, convertCurrency, getNextPaymentDate } from '@/lib/utils';
import { SearchPanel } from '@/components/search/SearchPanel';
import { NotificationPanel, generateNotifications } from '@/components/notifications/NotificationPanel';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { useNotificationRead } from '@/hooks/useNotificationRead';


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
const AnalyticsPage = dynamic(() =>
  import('@/components/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
  { ssr: false }
);
const CalendarPage = dynamic(() =>
  import('@/components/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
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
  const [tabDirection, setTabDirection] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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

  const { playSuccess, playDelete, playPaid } = useSound();

  // Auto exchange rate from CBR
  const {
    rate: autoRate,
    lastUpdated: rateLastUpdated,
    isLoading: rateIsLoading,
    refresh: refreshRate,
  } = useExchangeRate(settings.exchangeRate);

  // Sync auto rate to settings (only if not using manual rate)
  useEffect(() => {
    if (!settings.useManualRate && autoRate !== settings.exchangeRate) {
      setExchangeRate(autoRate);
    }
  }, [autoRate, settings.useManualRate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notifications — auto-registers SW + schedules reminders
  useNotifications(subscriptions, settings);

  // Notification read state
  const { isRead, markAsRead, markAllAsRead, cleanup } = useNotificationRead();
  const allNotifications = useMemo(() => generateNotifications(subscriptions), [subscriptions]);
  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !isRead(n.id)).length,
    [allNotifications, isRead],
  );
  const hasUnreadDanger = useMemo(
    () => allNotifications.some((n) => n.type === 'danger' && !isRead(n.id)),
    [allNotifications, isRead],
  );

  // Cleanup stale read IDs on mount
  useEffect(() => {
    if (allNotifications.length > 0 || subscriptions.length > 0) {
      cleanup(allNotifications.map((n) => n.id));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = useCallback((tab: TabId) => {
    const prevIdx = TAB_ORDER.indexOf(activeTab);
    const nextIdx = TAB_ORDER.indexOf(tab);
    setTabDirection(nextIdx > prevIdx ? 1 : -1);
    setActiveTab(tab);
  }, [activeTab]);

  const openAdd = useCallback(() => setShowAddModal(true), []);
  const closeAdd = useCallback(() => setShowAddModal(false), []);
  const openDetail = useCallback((sub: Subscription) => setSelectedSubId(sub.id), []);
  const closeDetail = useCallback(() => setSelectedSubId(null), []);
  const closeEdit = useCallback(() => setEditingSubId(null), []);

  const handleMarkPaid = useCallback((sub: Subscription) => {
    const nextDate = getNextPaymentDate(sub.nextPaymentDate, sub.cycle);
    updateSubscription(sub.id, { nextPaymentDate: nextDate });
    playPaid();
  }, [updateSubscription, playPaid]);

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
    <div className="app-container fixed inset-0 min-h-dvh flex flex-col max-w-[430px] mx-auto overflow-hidden bg-gradient-to-b from-surface to-[#07070C]">
      <Header
        title={tabTitles[activeTab]}
        collapsed={headerCollapsed}
        onSearchTap={activeTab === 'home' ? () => setShowSearch(true) : undefined}
        onNotificationTap={activeTab === 'home' ? () => setShowNotifications(true) : undefined}
        notificationCount={activeTab === 'home' ? unreadCount : 0}
        hasDanger={activeTab === 'home' ? hasUnreadDanger : false}
      />

      <main ref={mainRef} className="flex-1 min-h-0 scrollable-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: tabDirection * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tabDirection * -40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="pb-4"
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
                onMarkPaid={handleMarkPaid}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPage
                subscriptions={subscriptions}
                categories={categories}
                settings={settings}
                onSubTap={openDetail}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarPage
                subscriptions={subscriptions}
                settings={settings}
                onSubTap={openDetail}
              />
            )}
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
                rateLastUpdated={rateLastUpdated}
                rateIsLoading={rateIsLoading}
                onRefreshRate={refreshRate}
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

      {/* Search Panel */}
      <SearchPanel
        open={showSearch}
        subscriptions={subscriptions}
        categories={categories}
        onClose={() => setShowSearch(false)}
        onSelectSubscription={openDetail}
      />

      {/* Notification Panel */}
      <NotificationPanel
        open={showNotifications}
        subscriptions={subscriptions}
        onClose={() => setShowNotifications(false)}
        isRead={isRead}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
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
            onMarkPaid={() => handleMarkPaid(selectedSub)}
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

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
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
  onMarkPaid,
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
  onMarkPaid: (sub: Subscription) => void;
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

  // Insight IDs for badges
  const mostExpensiveId = useMemo(() => {
    if (active.length < 2) return null;
    let bestId: string | null = null;
    let bestMonthly = 0;
    for (const s of active) {
      const monthly = convertCurrency(
        getMonthlyPrice(s),
        s.currency as Currency,
        displayCurrency as Currency,
        exchangeRate,
      );
      if (monthly > bestMonthly) {
        bestMonthly = monthly;
        bestId = s.id;
      }
    }
    return bestId;
  }, [active, displayCurrency, exchangeRate]);

  const longestId = useMemo(() => {
    const recurring = active.filter((s) => s.cycle !== 'one-time' && s.cycle !== 'trial');
    if (recurring.length < 2) return null;
    let bestId: string | null = null;
    let oldest = Infinity;
    for (const s of recurring) {
      const t = new Date(s.startDate).getTime();
      if (t < oldest) {
        oldest = t;
        bestId = s.id;
      }
    }
    return bestId === mostExpensiveId ? null : bestId; // avoid double badge
  }, [active, mostExpensiveId]);

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
          onSubTap={onSubTap}
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
        onMarkPaid={onMarkPaid}
        onAddTap={onAddTap}
        mostExpensiveId={mostExpensiveId}
        longestId={longestId}
      />
    </div>
  );
}

