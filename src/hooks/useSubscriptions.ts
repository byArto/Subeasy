'use client';

import { useCallback } from 'react';
import { Subscription, DisplayCurrency, Currency } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import { generateId, getMonthlyPrice, getDaysUntilPayment, convertCurrency } from '@/lib/utils';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useLocalStorage<Subscription[]>(
    'neonsub-subscriptions',
    []
  );

  const addSubscription = useCallback(
    (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newSub: Subscription = {
        ...sub,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      setSubscriptions((prev) => [...prev, newSub]);
    },
    [setSubscriptions]
  );

  const updateSubscription = useCallback(
    (id: string, updates: Partial<Subscription>) => {
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        )
      );
    },
    [setSubscriptions]
  );

  const deleteSubscription = useCallback(
    (id: string) => {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    },
    [setSubscriptions]
  );

  const getSubscription = useCallback(
    (id: string): Subscription | undefined => {
      return subscriptions.find((s) => s.id === id);
    },
    [subscriptions]
  );

  const getActiveSubscriptions = useCallback((): Subscription[] => {
    return subscriptions.filter((s) => s.isActive);
  }, [subscriptions]);

  const getUpcomingPayments = useCallback(
    (days: number): Subscription[] => {
      return subscriptions
        .filter((s) => {
          if (!s.isActive) return false;
          const d = getDaysUntilPayment(s.nextPaymentDate);
          return d >= 0 && d <= days;
        })
        .sort(
          (a, b) =>
            new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
        );
    },
    [subscriptions]
  );

  const getByCategory = useCallback(
    (categoryId: string): Subscription[] => {
      return subscriptions.filter((s) => s.category === categoryId);
    },
    [subscriptions]
  );

  const getTotalMonthly = useCallback(
    (currency: DisplayCurrency, rate: number): number => {
      const active = subscriptions.filter((s) => s.isActive);

      const total = active.reduce((sum, sub) => {
        const monthly = getMonthlyPrice(sub);
        const converted = convertCurrency(monthly, sub.currency as Currency, currency, rate);
        return sum + converted;
      }, 0);

      return Math.round(total * 100) / 100;
    },
    [subscriptions]
  );

  const getTotalYearly = useCallback(
    (currency: DisplayCurrency, rate: number): number => {
      return Math.round(getTotalMonthly(currency, rate) * 12 * 100) / 100;
    },
    [getTotalMonthly]
  );

  return {
    subscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getSubscription,
    getActiveSubscriptions,
    getUpcomingPayments,
    getTotalMonthly,
    getTotalYearly,
    getByCategory,
  };
}
