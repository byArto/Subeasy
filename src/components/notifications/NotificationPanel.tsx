'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subscription } from '@/lib/types';
import { getDaysUntilPayment, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Lang } from '@/lib/translations';

/* ── Types ── */

export interface NotificationItem {
  id: string;
  type: 'danger' | 'warning' | 'info';
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  daysUntil: number;
}

interface NotificationPanelProps {
  open: boolean;
  subscriptions: Subscription[];
  notifyDaysBefore: number;
  onClose: () => void;
  isRead: (id: string) => boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (ids: string[]) => void;
}

/* ── Helpers ── */

function formatDate(dateStr: string, lang: Lang): string {
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${Math.round(price).toLocaleString('ru-RU')} ${symbol}`;
}

const TYPE_BORDER: Record<string, string> = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-neon',
};

/* ── Generate notifications from subscriptions ── */

type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export function generateNotifications(
  subscriptions: Subscription[],
  notifyDaysBefore = 7,
  t: TFunc,
  lang: Lang = 'ru',
): NotificationItem[] {
  const items: NotificationItem[] = [];

  subscriptions.filter((s) => s.isActive).forEach((sub) => {
    const daysUntil = getDaysUntilPayment(sub.nextPaymentDate);
    const price = formatPrice(sub.price, sub.currency);
    const isTrial = sub.cycle === 'trial';
    const dateKey = sub.nextPaymentDate;

    // Skip future payments outside the notification window
    if (daysUntil > notifyDaysBefore) return;

    const dateFormatted = formatDate(sub.nextPaymentDate, lang);

    if (daysUntil < 0) {
      items.push({
        id: `${sub.id}-overdue-${dateKey}`,
        type: 'danger',
        icon: isTrial ? '⏳' : '🔴',
        title: isTrial
          ? t('notif.trialExpiredTitle', { name: sub.name })
          : t('notif.overdueTitle', { name: sub.name }),
        subtitle: isTrial
          ? (sub.price > 0 ? t('notif.further', { price }) : t('notif.cancelHint'))
          : t('notif.overdueDate', { date: dateFormatted }),
        time: t('notif.daysAgo', { days: Math.abs(daysUntil) }),
        daysUntil,
      });
    } else if (daysUntil === 0) {
      items.push({
        id: `${sub.id}-today-${dateKey}`,
        type: 'danger',
        icon: isTrial ? '⏳' : '⚡',
        title: isTrial
          ? t('notif.trialEndingTitle', { name: sub.name })
          : t('notif.paymentTodayTitle', { name: sub.name }),
        subtitle: isTrial
          ? (sub.price > 0 ? t('notif.further', { price }) : t('notif.lastDay'))
          : price,
        time: t('notif.today'),
        daysUntil,
      });
    } else if (daysUntil <= 3) {
      items.push({
        id: `${sub.id}-soon-${dateKey}`,
        type: 'warning',
        icon: isTrial ? '⏳' : '⏰',
        title: isTrial
          ? t('notif.trialSoonTitle', { name: sub.name, days: daysUntil })
          : t('notif.soonTitle', { name: sub.name, days: daysUntil }),
        subtitle: isTrial
          ? (sub.price > 0 ? t('notif.further', { price }) : t('notif.cancelHint'))
          : price,
        time: dateFormatted,
        daysUntil,
      });
    } else if (daysUntil <= 7) {
      items.push({
        id: `${sub.id}-week-${dateKey}`,
        type: 'info',
        icon: isTrial ? '⏳' : '📅',
        title: isTrial
          ? t('notif.trialSoonTitle', { name: sub.name, days: daysUntil })
          : t('notif.soonTitle', { name: sub.name, days: daysUntil }),
        subtitle: isTrial
          ? (sub.price > 0 ? t('notif.further', { price }) : `${t('calendar.today')} ${dateFormatted}`)
          : price,
        time: dateFormatted,
        daysUntil,
      });
    }
  });

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

/* ── Component ── */

export function NotificationPanel({
  open,
  subscriptions,
  notifyDaysBefore,
  onClose,
  isRead,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  const { t, lang } = useLanguage();

  const notifications = useMemo(
    () => generateNotifications(subscriptions, notifyDaysBefore, t, lang),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscriptions, notifyDaysBefore, lang],
  );

  const unread = useMemo(() => notifications.filter((n) => !isRead(n.id)), [notifications, isRead]);
  const read = useMemo(() => notifications.filter((n) => isRead(n.id)), [notifications, isRead]);

  const [showDone, setShowDone] = useState(false);

  // Reset "done" flash when panel closes
  useEffect(() => {
    if (!open) setShowDone(false);
  }, [open]);

  function handleMarkAll() {
    onMarkAllAsRead(notifications.map((n) => n.id));
    setShowDone(true);
    setTimeout(() => setShowDone(false), 1500);
  }

  const allRead = notifications.length > 0 && unread.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Panel — slide down from top */}
          <motion.div
            initial={{ y: '-100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={cn(
              'fixed top-0 left-0 right-0 z-50',
              'mx-auto max-w-[430px]',
              'bg-surface-2 rounded-b-2xl',
              'border-b border-x border-border-subtle',
              'pt-[env(safe-area-inset-top)]',
              'max-h-[70dvh] flex flex-col',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <h2 className="font-display font-bold text-base text-text-primary">
                {t('notif.title')}
              </h2>

              <div className="flex items-center gap-2">
                {/* Mark all as read */}
                <AnimatePresence mode="wait">
                  {unread.length > 0 && !showDone && (
                    <motion.button
                      key="mark-all"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleMarkAll}
                      className="text-xs font-medium text-neon px-2 py-1"
                    >
                      {t('notif.markAll')}
                    </motion.button>
                  )}
                  {showDone && (
                    <motion.span
                      key="done"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-medium text-neon px-2 py-1"
                    >
                      {t('notif.done')}
                    </motion.span>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-sm font-medium text-text-secondary px-2 py-1"
                >
                  {t('notif.close')}
                </motion.button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-medium text-text-primary">{t('notif.allQuiet')}</p>
                  <p className="text-xs text-text-muted text-center max-w-[220px]">
                    {t('notif.allQuietDesc')}
                  </p>
                </div>
              ) : allRead ? (
                /* All read state */
                <div className="flex flex-col items-center py-10 gap-3">
                  <span className="text-3xl">✅</span>
                  <p className="text-sm font-medium text-neon">{t('notif.allRead')}</p>
                  <p className="text-xs text-text-muted text-center max-w-[240px]">
                    {t('notif.allReadDesc')}
                  </p>

                  {/* Show read items below, faded */}
                  <div className="w-full mt-4 space-y-1.5">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest pl-1 mb-2">
                      {t('notif.past')}
                    </p>
                    {read.map((notif, i) => (
                      <NotifRow
                        key={notif.id}
                        notif={notif}
                        index={i}
                        isRead
                        onTap={() => {}}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Unread group */}
                  {unread.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest pl-1 mb-2">
                        {t('notif.unread')}
                      </p>
                      <div className="space-y-2">
                        {unread.map((notif, i) => (
                          <NotifRow
                            key={notif.id}
                            notif={notif}
                            index={i}
                            isRead={false}
                            onTap={() => onMarkAsRead(notif.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Read group */}
                  {read.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest pl-1 mb-2">
                        {t('notif.past')}
                      </p>
                      <div className="space-y-1.5">
                        {read.map((notif, i) => (
                          <NotifRow
                            key={notif.id}
                            notif={notif}
                            index={unread.length + i}
                            isRead
                            onTap={() => {}}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Notification row ── */

function NotifRow({
  notif,
  index,
  isRead,
  onTap,
}: {
  notif: NotificationItem;
  index: number;
  isRead: boolean;
  onTap: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: isRead ? 0.5 : 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
      onClick={onTap}
      className={cn(
        'flex items-start gap-3 p-3.5',
        'bg-surface-3 rounded-xl',
        isRead
          ? 'border-l-[3px] border-l-transparent'
          : cn('border-l-[3px]', TYPE_BORDER[notif.type]),
        !isRead && 'cursor-pointer active:bg-surface-4 transition-colors',
      )}
    >
      {/* Icon */}
      <span className="text-lg shrink-0 mt-0.5">
        {isRead ? '✓' : notif.icon}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-semibold leading-snug',
            isRead ? 'text-text-muted' : 'text-text-primary',
          )}
        >
          {notif.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{notif.subtitle}</p>
      </div>

      {/* Time */}
      <span className="text-[11px] text-text-muted shrink-0 mt-0.5">
        {notif.time}
      </span>
    </motion.div>
  );
}
