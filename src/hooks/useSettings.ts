'use client';

import { useCallback } from 'react';
import { AppSettings } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_SETTINGS } from '@/lib/constants';

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
    setSettings((prev) => ({
      ...prev,
      displayCurrency: prev.displayCurrency === 'RUB' ? 'USD' : 'RUB',
    }));
  }, [setSettings]);

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
    setExchangeRate,
  };
}
