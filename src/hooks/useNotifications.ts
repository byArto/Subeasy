'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Subscription, AppSettings } from '@/lib/types';
import {
  registerServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
  checkAndSchedulePaymentReminders,
} from '@/lib/notifications';

type Permission = NotificationPermission | 'unsupported';

export function useNotifications(
  subscriptions: Subscription[],
  settings: AppSettings
) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<Permission>('default');
  const initialized = useRef(false);

  // Init: check support, register SW, check permission
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const supported =
      typeof window !== 'undefined' && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(getNotificationPermission());
    }

    // Register service worker
    registerServiceWorker();
  }, []);

  // Request permission (requires user interaction)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    return granted;
  }, []);

  // Schedule reminders based on current subscriptions + settings
  const scheduleReminders = useCallback(() => {
    checkAndSchedulePaymentReminders(subscriptions, settings);
  }, [subscriptions, settings]);

  // Auto-schedule when enabled + granted + data changes
  useEffect(() => {
    if (!isSupported) return;
    if (permission !== 'granted') return;
    if (!settings.notificationsEnabled) return;

    scheduleReminders();

    // Re-check every hour
    const interval = setInterval(scheduleReminders, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSupported, permission, settings.notificationsEnabled, scheduleReminders]);

  return {
    isSupported,
    permission,
    requestPermission,
    scheduleReminders,
  };
}
