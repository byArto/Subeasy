'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { TabBar, TabId } from '@/components/layout/TabBar';
import { Modal } from '@/components/ui';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CategoryFilter, SortOption } from '@/components/dashboard/CategoryFilter';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { SubList } from '@/components/subscription/SubList';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { useSettings } from '@/hooks/useSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { SplashScreen } from '@/components/SplashScreen';
import { useSound } from '@/hooks/useSound';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTelegramContext } from '@/components/providers/TelegramProvider';
import { useSync } from '@/hooks/useSync';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { Subscription, Currency, DisplayCurrency } from '@/lib/types';
import { getMonthlyPrice, convertCurrency, getNextPaymentDate, getDaysUntilPayment } from '@/lib/utils';
import { SearchPanel } from '@/components/search/SearchPanel';
import { NotificationPanel, generateNotifications } from '@/components/notifications/NotificationPanel';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { useNotificationRead } from '@/hooks/useNotificationRead';
import { ProBadge, ProModal } from '@/components/pro';
import { ShareModal } from '@/components/share/ShareModal';
import { DuplicateBanner } from '@/components/dashboard/DuplicateBanner';
import { findDuplicates, getIgnoredPairs, ignorePair, isGroupIgnored } from '@/lib/duplicates';
import { useSaveTelegramChatId } from '@/hooks/useSaveTelegramChatId';
import { generateId } from '@/lib/utils';


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
const AuthScreen = dynamic(() =>
  import('@/components/auth/AuthScreen').then((m) => ({ default: m.AuthScreen })),
  { ssr: false }
);

const TAB_ORDER: TabId[] = ['home', 'analytics', 'calendar', 'settings'];

const TAB_TITLE_KEYS: Record<TabId, string> = {
  home: 'nav.home',
  analytics: 'nav.analytics',
  calendar: 'nav.calendar',
  settings: 'nav.settings',
};

export default function Home() {
  // Remove inline HTML splash as soon as React mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { __removeSplash?: () => void }).__removeSplash) {
      (window as unknown as { __removeSplash: () => void }).__removeSplash();
    }
  }, []);

  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [tabDirection, setTabDirection] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [joinWorkspaceName, setJoinWorkspaceName] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // Telegram Back Button — show when any modal is open, close topmost on press
  const { isTelegram } = useTelegramContext();
  useEffect(() => {
    if (!isTelegram) return;
    const backBtn = window.Telegram?.WebApp?.BackButton;
    if (!backBtn) return;

    const anyOpen = showAddModal || !!selectedSubId || !!editingSubId || showSearch || showNotifications || showProModal;

    if (anyOpen) {
      backBtn.show();
      const handleBack = () => {
        if (editingSubId)       { setEditingSubId(null); return; }
        if (selectedSubId)      { setSelectedSubId(null); return; }
        if (showAddModal)       { setShowAddModal(false); return; }
        if (showSearch)         { setShowSearch(false); return; }
        if (showNotifications)  { setShowNotifications(false); return; }
        if (showProModal)       { setShowProModal(false); return; }
      };
      backBtn.onClick(handleBack);
      return () => { backBtn.offClick(handleBack); };
    } else {
      backBtn.hide();
    }
  }, [isTelegram, showAddModal, selectedSubId, editingSubId, showSearch, showNotifications, showProModal]);

  // Track scroll position for header collapse
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setHeaderCollapsed(el.scrollTop > 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [splashDone]);

  // Auth
  const { user, loading: authLoading, skipAuth } = useAuth();
  const { t, lang } = useLanguage();
  const { workspace, isWorkspaceActive, workspaceSubscriptions, refreshWorkspaceSubs, reloadWorkspace } = useWorkspace();

  // Handle ?join=TOKEN invite link
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('join');
    if (!token) return;

    // Remove param from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url.toString());

    setJoinToken(token);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save Telegram chat_id to Supabase for push notifications
  useSaveTelegramChatId();

  // Shared hooks
  const {
    subscriptions,
    setSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
  } = useSubscriptions();
  const { categories, setCategories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { settings, setSettings, updateSettings, toggleCurrency, setExchangeRate } = useSettings();

  // Sync with Supabase
  useSync(user, subscriptions, categories, settings, {
    setSubscriptions,
    setCategories,
    setSettings,
  });

  const { playSuccess, playDelete, playPaid } = useSound();

  // When workspace mode is active, show workspace pool instead of personal subs
  const activeSubscriptions = isWorkspaceActive ? workspaceSubscriptions : subscriptions;

  // Workspace-aware CRUD: routes through service-client API (bypasses RLS)
  const wsAddSubscription = useCallback(async (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isWorkspaceActive && workspace && user) {
      const now = new Date().toISOString();
      const newSub: Subscription = { ...data, id: generateId(), createdAt: now, updatedAt: now, workspaceId: workspace.id };
      await fetch('/api/workspace/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: newSub, workspaceId: workspace.id, userId: user.id }),
      });
      await refreshWorkspaceSubs();
    } else {
      addSubscription(data);
    }
  }, [isWorkspaceActive, workspace, user, addSubscription, refreshWorkspaceSubs]);

  const wsUpdateSubscription = useCallback(async (id: string, updates: Partial<Subscription>) => {
    if (isWorkspaceActive && workspace && user) {
      const sub = workspaceSubscriptions.find((s) => s.id === id);
      if (sub) {
        const updated: Subscription = { ...sub, ...updates, updatedAt: new Date().toISOString() };
        await fetch('/api/workspace/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: updated, workspaceId: workspace.id, userId: user.id }),
        });
        await refreshWorkspaceSubs();
      }
    } else {
      updateSubscription(id, updates);
    }
  }, [isWorkspaceActive, workspace, user, workspaceSubscriptions, updateSubscription, refreshWorkspaceSubs]);

  const wsDeleteSubscription = useCallback(async (id: string) => {
    if (isWorkspaceActive && workspace) {
      await fetch(`/api/workspace/subscriptions?id=${id}`, { method: 'DELETE' });
      await refreshWorkspaceSubs();
    } else {
      deleteSubscription(id);
    }
  }, [isWorkspaceActive, workspace, deleteSubscription, refreshWorkspaceSubs]);

  // Computed functions derived from activeSubscriptions (used by HomeTab)
  const getActiveSubs = useCallback(() => activeSubscriptions.filter((s) => s.isActive), [activeSubscriptions]);
  const getUpcomingSubs = useCallback((days: number) =>
    activeSubscriptions
      .filter((s) => { if (!s.isActive) return false; const d = getDaysUntilPayment(s.nextPaymentDate); return d >= 0 && d <= days; })
      .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()),
  [activeSubscriptions]);
  const getTotalMonthlyActive = useCallback((currency: DisplayCurrency, rate: number) => {
    const total = activeSubscriptions.filter((s) => s.isActive).reduce((sum, sub) => {
      return sum + convertCurrency(getMonthlyPrice(sub), sub.currency as Currency, currency, rate);
    }, 0);
    return Math.round(total * 100) / 100;
  }, [activeSubscriptions]);
  const getTotalYearlyActive = useCallback((currency: DisplayCurrency, rate: number) =>
    Math.round(getTotalMonthlyActive(currency, rate) * 12 * 100) / 100,
  [getTotalMonthlyActive]);

  // Auto exchange rate from CBR
  const {
    rate: autoRate,
    eurRate: autoEurRate,
    lastUpdated: rateLastUpdated,
    isLoading: rateIsLoading,
    refresh: refreshRate,
  } = useExchangeRate(settings.exchangeRate, settings.eurExchangeRate ?? 105);

  // Sync auto rate to settings (only if not using manual rate)
  useEffect(() => {
    if (!settings.useManualRate) {
      const updates: Record<string, number> = {};
      if (autoRate !== settings.exchangeRate) updates.exchangeRate = autoRate;
      if (autoEurRate !== settings.eurExchangeRate) updates.eurExchangeRate = autoEurRate;
      if (Object.keys(updates).length > 0) updateSettings(updates);
    }
  }, [autoRate, autoEurRate, settings.useManualRate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notifications — auto-registers SW + schedules reminders
  useNotifications(activeSubscriptions, settings);

  // Notification read state
  const { isRead, markAsRead, markAllAsRead, cleanup } = useNotificationRead();
  const allNotifications = useMemo(
    () => generateNotifications(activeSubscriptions, settings.notifyDaysBefore, t, lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSubscriptions, settings.notifyDaysBefore, lang],
  );
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
    if (allNotifications.length > 0 || activeSubscriptions.length > 0) {
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
    wsUpdateSubscription(sub.id, { nextPaymentDate: nextDate });
    playPaid();
  }, [wsUpdateSubscription, playPaid]);

  const handleDeleteSub = useCallback((sub: Subscription) => {
    wsDeleteSubscription(sub.id);
    playDelete();
  }, [wsDeleteSubscription, playDelete]);

  // Memoized subscription lookups for modals
  const selectedSub = useMemo(
    () => (selectedSubId ? activeSubscriptions.find((s) => s.id === selectedSubId) : undefined),
    [selectedSubId, activeSubscriptions]
  );
  const editingSub = useMemo(
    () => (editingSubId ? activeSubscriptions.find((s) => s.id === editingSubId) : undefined),
    [editingSubId, activeSubscriptions]
  );

  // Splash screen
  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  // Auth gate — show login if not authenticated and not skipped
  if (!authLoading && !user && !skipAuth) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container fixed inset-0 min-h-dvh flex flex-col max-w-[430px] mx-auto overflow-hidden bg-gradient-to-b from-surface to-[#07070C]">
      <Header
        title={t(TAB_TITLE_KEYS[activeTab])}
        titleBadge={activeTab === 'home' ? <ProBadge onOpen={() => setShowProModal(true)} /> : undefined}
        collapsed={headerCollapsed}
        onSearchTap={activeTab === 'home' ? () => setShowSearch(true) : undefined}
        onNotificationTap={activeTab === 'home' ? () => setShowNotifications(true) : undefined}
        notificationCount={activeTab === 'home' ? unreadCount : 0}
        hasDanger={activeTab === 'home' ? hasUnreadDanger : false}
      />

      {/* ── Workspace Switcher Banner — only when workspace mode is active ── */}
      {workspace && isWorkspaceActive && activeTab === 'home' && (
        <WorkspaceBanner workspaceName={workspace.name} lang={lang} />
      )}

      {/* ── Join Invite Dialog ── */}
      <AnimatePresence>
        {joinToken && user && (
          <motion.div
            key="join-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full max-w-[390px] bg-surface-2 rounded-2xl border border-border-subtle p-5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">👨‍👩‍👧‍👦</span>
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {lang === 'ru' ? 'Приглашение в семейный план' : 'Family plan invite'}
                  </p>
                  {joinWorkspaceName && (
                    <p className="text-[11px] text-text-muted">{joinWorkspaceName}</p>
                  )}
                </div>
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {lang === 'ru'
                  ? 'Вас приглашают в общий список подписок. Вы будете видеть и редактировать подписки всей группы.'
                  : 'You\'re invited to a shared subscription list. You\'ll see and edit subscriptions for the whole group.'}
              </p>
              {joinError && (
                <p className="text-[12px] text-red-400 font-medium">{joinError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setJoinToken(null); setJoinError(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-surface-3 text-text-secondary"
                >
                  {lang === 'ru' ? 'Отклонить' : 'Decline'}
                </button>
                <button
                  type="button"
                  disabled={joinLoading}
                  onClick={async () => {
                    if (!joinToken || !user) return;
                    setJoinLoading(true);
                    setJoinError('');
                    try {
                      const res = await fetch('/api/workspace/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: joinToken, userId: user.id }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setJoinWorkspaceName(data.workspaceName ?? '');
                        await reloadWorkspace();
                        setJoinToken(null);
                      } else {
                        const msg = data?.error ?? '';
                        if (msg === 'Already owner') {
                          setJoinError(lang === 'ru' ? 'Вы владелец этого плана' : 'You own this plan');
                        } else if (msg.includes('another workspace')) {
                          setJoinError(lang === 'ru' ? 'Вы уже состоите в другом семейном плане. Сначала покиньте его.' : 'You\'re already in another plan. Leave it first.');
                        } else if (msg.includes('full')) {
                          setJoinError(lang === 'ru' ? 'Семейный план заполнен (макс. 5)' : 'Plan is full (max 5)');
                        } else if (msg.includes('Invalid')) {
                          setJoinError(lang === 'ru' ? 'Ссылка недействительна' : 'Invalid invite link');
                        } else {
                          setJoinError(lang === 'ru' ? 'Ошибка. Попробуйте ещё раз' : 'Error. Please try again');
                        }
                      }
                    } catch {
                      setJoinError(lang === 'ru' ? 'Нет соединения' : 'No connection');
                    } finally {
                      setJoinLoading(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-neon text-surface disabled:opacity-50"
                >
                  {joinLoading
                    ? (lang === 'ru' ? 'Присоединяемся…' : 'Joining…')
                    : (lang === 'ru' ? 'Присоединиться' : 'Join')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main ref={mainRef} className="flex-1 min-h-0 scrollable-content">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pb-4"
          >
            {activeTab === 'home' && (
              <HomeTab
                subscriptions={activeSubscriptions}
                categories={categories}
                settings={settings}
                getTotalMonthly={getTotalMonthlyActive}
                getTotalYearly={getTotalYearlyActive}
                getActiveSubscriptions={getActiveSubs}
                getUpcomingPayments={getUpcomingSubs}
                onAddTap={openAdd}
                onSubTap={openDetail}
                onMarkPaid={handleMarkPaid}
                onDeleteSub={handleDeleteSub}
                onDeactivateSub={(id) => wsUpdateSubscription(id, { isActive: false })}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPage
                subscriptions={activeSubscriptions}
                categories={categories}
                settings={settings}
                onSubTap={openDetail}
                onOpenPro={() => setShowProModal(true)}
                onUpdateSettings={updateSettings}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarPage
                subscriptions={activeSubscriptions}
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
                subscriptions={activeSubscriptions}
                rateLastUpdated={rateLastUpdated}
                rateIsLoading={rateIsLoading}
                onRefreshRate={refreshRate}
                onOpenPro={() => setShowProModal(true)}
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
        subscriptions={activeSubscriptions}
        categories={categories}
        onClose={() => setShowSearch(false)}
        onSelectSubscription={openDetail}
      />

      {/* Notification Panel */}
      <NotificationPanel
        open={showNotifications}
        subscriptions={activeSubscriptions}
        notifyDaysBefore={settings.notifyDaysBefore}
        onClose={() => setShowNotifications(false)}
        isRead={isRead}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Add Modal */}
      <Modal
        open={showAddModal}
        onClose={closeAdd}
        title={t('modal.newSubscription')}
      >
        <SubForm
          mode="add"
          categories={categories}
          existingSubscriptions={activeSubscriptions}
          onSubmit={async (data) => {
            await wsAddSubscription(data);
            playSuccess();
            closeAdd();
          }}
          onAddCategory={addCategory}
          onClose={closeAdd}
          settings={settings}
          currentMonthlyTotal={getTotalMonthlyActive(settings.displayCurrency, settings.exchangeRate)}
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
              wsUpdateSubscription(selectedSub.id, { isActive: !selectedSub.isActive });
            }}
            onDelete={() => {
              wsDeleteSubscription(selectedSub.id);
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
        title={t('modal.editSubscription')}
      >
        {editingSub && (
          <SubForm
            mode="edit"
            initialData={editingSub}
            categories={categories}
            onSubmit={async (data) => {
              await wsUpdateSubscription(editingSubId!, data);
              playSuccess();
              closeEdit();
            }}
            onDelete={async () => {
              await wsDeleteSubscription(editingSubId!);
              playDelete();
              closeEdit();
            }}
            onAddCategory={addCategory}
            onClose={closeEdit}
          />
        )}
      </Modal>

      {/* PRO Modal */}
      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />

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
  onDeleteSub,
  onDeactivateSub,
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
  onDeleteSub: (sub: Subscription) => void;
  onDeactivateSub: (id: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [hidePaused, setHidePaused] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [ignoredDups, setIgnoredDups] = useState<Set<string>>(() => getIgnoredPairs());

  const { lang } = useLanguage();
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
  const upcoming = useMemo(() => getUpcomingPayments(3), [getUpcomingPayments]);

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

  const dupGroups = useMemo(
    () => findDuplicates(subscriptions).filter((g) => !isGroupIgnored(g, ignoredDups)),
    [subscriptions, ignoredDups],
  );

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
          onShare={() => setShowShareModal(true)}
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

      {/* Duplicate detector banner */}
      <AnimatePresence>
        {dupGroups.length > 0 && (
          <DuplicateBanner
            groups={dupGroups}
            onDeactivate={onDeactivateSub}
            onDelete={(id) => onDeleteSub(subscriptions.find((s) => s.id === id)!)}
            onIgnore={(id1, id2) => {
              ignorePair(id1, id2);
              setIgnoredDups(getIgnoredPairs());
            }}
          />
        )}
      </AnimatePresence>

      {/* Search + Category + Sort filter */}
      {hasSubscriptions && (
        <CategoryFilter
          categories={categories}
          subscriptions={subscriptions}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hidePaused={hidePaused}
          onHidePausedChange={setHidePaused}
          pausedCount={subscriptions.filter((s) => !s.isActive).length}
        />
      )}

      {/* Sub list */}
      <SubList
        subscriptions={subscriptions}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        sortBy={sortBy}
        hidePaused={hidePaused}
        onSubTap={onSubTap}
        onMarkPaid={onMarkPaid}
        onDelete={onDeleteSub}
        onAddTap={onAddTap}
        mostExpensiveId={mostExpensiveId}
        longestId={longestId}
        notifyDaysBefore={settings.notifyDaysBefore}
      />

      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        totalMonthly={totalMonthly}
        totalYearly={totalYearly}
        activeCount={active.length}
        currency={displayCurrency}
        subscriptions={active}
        lang={lang}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}

/* ── Workspace Banner ── */
function WorkspaceBanner({ workspaceName, lang }: { workspaceName: string; lang: string }) {
  const { members, switchToPersonal } = useWorkspace();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-5 py-2 bg-surface-2 border-b border-border-subtle"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs">👨‍👩‍👧‍👦</span>
        <span className="text-xs font-semibold text-neon">{workspaceName}</span>
        <span className="text-[10px] text-text-muted">·</span>
        <span className="text-[10px] text-text-muted">
          {members.length} {lang === 'ru' ? 'уч.' : 'mbr'}
        </span>
      </div>
      <button
        type="button"
        onClick={switchToPersonal}
        className="flex items-center gap-1 text-[11px] font-semibold text-text-muted active:text-text-primary transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        {lang === 'ru' ? '→ Перейти в личный режим' : '→ Personal mode'}
      </button>
    </motion.div>
  );
}

