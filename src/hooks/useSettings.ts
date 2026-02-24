'use client';

import { useCallback } from 'react';
import { DisplayCurrency, AppSettings } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_SETTINGS } from '@/lib/constants';

const CURRENCY_CYCLE: DisplayCurrency[] = ['RUB', 'USD', 'EUR'];

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'neonsub-settings',
    DEFAULT_SETTINGS
  );

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [setSettings]
  );

  const toggleCurrency = useCallback(() => {
    setSettings((prev) => {
      const idx = CURRENCY_CYCLE.indexOf(prev.displayCurrency);
      const next = CURRENCY_CYCLE[(idx + 1) % CURRENCY_CYCLE.length];
      return { ...prev, displayCurrency: next };
    });
  }, [setSettings]);

  const setDisplayCurrency = useCallback(
    (currency: DisplayCurrency) => {
      setSettings((prev) => ({ ...prev, displayCurrency: currency }));
    },
    [setSettings]
  );

  const setExchangeRate = useCallback(
    (rate: number) => {
      setSettings((prev) => ({ ...prev, exchangeRate: rate }));
    },
    [setSettings]
  );

  return {
    settings,
    setSettings,
    updateSettings,
    toggleCurrency,
    setDisplayCurrency,
    setExchangeRate,
  };
}
