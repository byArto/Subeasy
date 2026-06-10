import { Subscription, AppSettings } from './types';
import { getDaysUntilPayment } from './utils';
import { CURRENCY_SYMBOLS } from './constants';

/* ── Helpers ── */

function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/* ── Service Worker Registration ── */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch {
    return null;
  }
}

/* ── Permission ── */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/* ── Local Notification via SW ── */

async function showNotificationViaSW(title: string, body: string, tag: string): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker?.ready;
  if (registration) {
    await registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag,
      data: { url: '/' },
    } as NotificationOptions);
  } else {
    // Fallback to direct Notification API
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      tag,
    });
  }
}

/* ── Web Push (background notifications, e.g. Google Play / Android Chrome) ── */

/** True when the browser supports background Web Push (Service Worker + PushManager). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/** VAPID public key is base64url — the PushManager needs it as raw bytes. */
function urlBase64ToBytes(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Subscribe this device to Web Push and persist it server-side.
 * Safe to call repeatedly (idempotent — reuses any existing subscription).
 * No-ops when push is unsupported, permission isn't granted, or VAPID isn't configured.
 * `getToken` returns the Supabase access token (auth required to save the subscription).
 */
export async function subscribeToPush(getToken: () => Promise<string | null>): Promise<boolean> {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !isPushSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(vapidKey),
      });
    }

    const token = await getToken();
    if (!token) return false;

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Schedule Local Notification ── */

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleLocalNotification(
  title: string,
  body: string,
  tag: string,
  delayMs: number
): void {
  // Cancel existing timer for this tag
  if (scheduledTimers.has(tag)) {
    clearTimeout(scheduledTimers.get(tag));
  }

  if (delayMs <= 0) {
    // Fire immediately
    showNotificationViaSW(title, body, tag);
    return;
  }

  const timer = setTimeout(() => {
    showNotificationViaSW(title, body, tag);
    scheduledTimers.delete(tag);
  }, delayMs);

  scheduledTimers.set(tag, timer);
}

export function clearAllScheduledNotifications(): void {
  scheduledTimers.forEach((timer) => clearTimeout(timer));
  scheduledTimers.clear();
}

/* ── Check & Schedule Payment Reminders ── */

export function checkAndSchedulePaymentReminders(
  subscriptions: Subscription[],
  settings: AppSettings
): void {
  if (!settings.notificationsEnabled) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  // Clear previous schedules
  clearAllScheduledNotifications();

  const active = subscriptions.filter((s) => s.isActive);
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const notifiedKey = `neonsub-notified-${todayKey}`;

  // Track which subs were already notified today
  let notifiedIds: string[] = [];
  try {
    notifiedIds = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
  } catch {
    // ignore
  }

  const newlyNotified: string[] = [...notifiedIds];

  for (const sub of active) {
    const days = getDaysUntilPayment(sub.nextPaymentDate);

    // Only notify if within the reminder window
    if (days < 0 || days > settings.notifyDaysBefore) continue;

    // Skip if already notified today for this sub
    if (notifiedIds.includes(sub.id)) continue;

    const symbol = CURRENCY_SYMBOLS[sub.currency] || sub.currency;
    const daysText =
      days === 0 ? 'сегодня' : days === 1 ? 'завтра' : `через ${days} дн.`;
    const priceText = `${sub.price.toLocaleString('ru-RU')} ${symbol}`;
    const isRecurring = sub.cycle === 'monthly' || sub.cycle === 'quarterly' || sub.cycle === 'yearly';

    const title = `${sub.icon} ${sub.name}`;
    // On the charge day itself, prompt to verify the amount — catches silent
    // price hikes (Netflix/Spotify, etc.) without needing bank access.
    const body =
      days === 0 && isRecurring
        ? `Спишется ${priceText}. Цена не изменилась? Проверь в приложении.`
        : `Оплата ${daysText} — ${priceText}`;
    const tag = `payment-${sub.id}`;

    // Schedule with a small stagger (1s apart) to avoid flooding
    const staggerMs = newlyNotified.length * 1000;
    scheduleLocalNotification(title, body, tag, staggerMs);

    newlyNotified.push(sub.id);
  }

  // Persist notified IDs for today
  try {
    localStorage.setItem(notifiedKey, JSON.stringify(newlyNotified));
  } catch {
    // ignore
  }
}
