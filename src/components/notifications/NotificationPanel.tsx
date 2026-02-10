'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subscription } from '@/lib/types';
import { getDaysUntilPayment, cn } from '@/lib/utils';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

/* ── Types ── */

interface NotificationItem {
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

    if (daysUntil < 0) {
      items.push({
        id: sub.id + '-overdue',
        type: 'danger',
        icon: '🔴',
        title: `${sub.name} — платёж просрочен`,
        subtitle: `Дата была ${formatDate(sub.nextPaymentDate)}`,
        time: `${Math.abs(daysUntil)} дн. назад`,
        daysUntil,
      });
    } else if (daysUntil === 0) {
      items.push({
        id: sub.id + '-today',
        type: 'danger',
        icon: '⚡',
        title: `${sub.name} — платёж сегодня!`,
        subtitle: price,
        time: 'Сегодня',
        daysUntil,
      });
    } else if (daysUntil <= 3) {
      items.push({
        id: sub.id + '-soon',
        type: 'warning',
        icon: '⏰',
        title: `${sub.name} — через ${daysUntil} дн.`,
        subtitle: price,
        time: formatDate(sub.nextPaymentDate),
        daysUntil,
      });
    } else if (daysUntil <= 7) {
      items.push({
        id: sub.id + '-week',
        type: 'info',
        icon: '📅',
        title: `${sub.name} — через ${daysUntil} дн.`,
        subtitle: price,
        time: formatDate(sub.nextPaymentDate),
        daysUntil,
      });
    }
  });

  // Sort: overdue first (most negative), then by closest date
  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Count of danger + warning notifications (for badge) */
export function getUrgentCount(subscriptions: Subscription[]): number {
  return generateNotifications(subscriptions).filter(
    (n) => n.type === 'danger' || n.type === 'warning',
  ).length;
}

/** Whether any danger notifications exist (for pulse animation) */
export function hasDangerNotifications(subscriptions: Subscription[]): boolean {
  return generateNotifications(subscriptions).some((n) => n.type === 'danger');
}

/* ── Component ── */

export function NotificationPanel({ open, subscriptions, onClose }: NotificationPanelProps) {
  const notifications = useMemo(() => generateNotifications(subscriptions), [subscriptions]);

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
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-sm font-medium text-text-secondary px-2 py-1"
              >
                Готово
              </motion.button>
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
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif, i) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                      className={cn(
                        'flex items-start gap-3 p-3.5',
                        'bg-surface-3 rounded-xl',
                        'border-l-[3px]',
                        TYPE_BORDER[notif.type],
                      )}
                    >
                      {/* Icon */}
                      <span className="text-lg shrink-0 mt-0.5">{notif.icon}</span>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary leading-snug">
                          {notif.title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">{notif.subtitle}</p>
                      </div>

                      {/* Time */}
                      <span className="text-[11px] text-text-muted shrink-0 mt-0.5">
                        {notif.time}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
