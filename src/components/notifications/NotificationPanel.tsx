'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subscription } from '@/lib/types';
import { getDaysUntilPayment, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

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
  onClose: () => void;
  isRead: (id: string) => boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (ids: string[]) => void;
}

/* ── Helpers ── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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

export function generateNotifications(subscriptions: Subscription[]): NotificationItem[] {
  const items: NotificationItem[] = [];

  subscriptions.filter((s) => s.isActive).forEach((sub) => {
    const daysUntil = getDaysUntilPayment(sub.nextPaymentDate);
    const price = formatPrice(sub.price, sub.currency);
    // Stable ID: subId-type-nextPaymentDate
    const dateKey = sub.nextPaymentDate;

    if (daysUntil < 0) {
      items.push({
        id: `${sub.id}-overdue-${dateKey}`,
        type: 'danger',
        icon: '🔴',
        title: `${sub.name} — платёж просрочен`,
        subtitle: `Дата была ${formatDate(sub.nextPaymentDate)}`,
        time: `${Math.abs(daysUntil)} дн. назад`,
        daysUntil,
      });
    } else if (daysUntil === 0) {
      items.push({
        id: `${sub.id}-today-${dateKey}`,
        type: 'danger',
        icon: '⚡',
        title: `${sub.name} — платёж сегодня!`,
        subtitle: price,
        time: 'Сегодня',
        daysUntil,
      });
    } else if (daysUntil <= 3) {
      items.push({
        id: `${sub.id}-soon-${dateKey}`,
        type: 'warning',
        icon: '⏰',
        title: `${sub.name} — через ${daysUntil} дн.`,
        subtitle: price,
        time: formatDate(sub.nextPaymentDate),
        daysUntil,
      });
    } else if (daysUntil <= 7) {
      items.push({
        id: `${sub.id}-week-${dateKey}`,
        type: 'info',
        icon: '📅',
        title: `${sub.name} — через ${daysUntil} дн.`,
        subtitle: price,
        time: formatDate(sub.nextPaymentDate),
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
  onClose,
  isRead,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  const notifications = useMemo(() => generateNotifications(subscriptions), [subscriptions]);

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
                Уведомления
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
                      Прочитать все
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
                      ✓ Готово
                    </motion.span>
                  )}
                </AnimatePresence>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-sm font-medium text-text-secondary px-2 py-1"
                >
                  Закрыть
                </motion.button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <span className="text-3xl">🎉</span>
                  <p className="text-sm font-medium text-text-primary">Всё спокойно!</p>
                  <p className="text-xs text-text-muted text-center max-w-[220px]">
                    Нет предстоящих платежей на ближайшую неделю
                  </p>
                </div>
              ) : allRead ? (
                /* All read state */
                <div className="flex flex-col items-center py-10 gap-3">
                  <span className="text-3xl">✅</span>
                  <p className="text-sm font-medium text-neon">Всё прочитано</p>
                  <p className="text-xs text-text-muted text-center max-w-[240px]">
                    Уведомления появятся при приближении даты платежа
                  </p>

                  {/* Show read items below, faded */}
                  <div className="w-full mt-4 space-y-1.5">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest pl-1 mb-2">
                      Ранее
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
                        Новые
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
                        Ранее
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
