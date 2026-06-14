'use client';

import { useCallback, useEffect } from 'react';
import { DisplayCurrency, AppSettings, Currency } from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';
import { ALL_CURRENCIES } from '@/lib/currency';
import { DEFAULT_SETTINGS } from '@/lib/constants';

const CURRENCY_CYCLE: DisplayCurrency[] = ALL_CURRENCIES;

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'neonsub-settings',
    DEFAULT_SETTINGS
  );

  // One-time migration: legacy custom-rate users (useManualRate=true, no manualRates)
  // had their override stored in the scalar exchangeRate/eurExchangeRate fields.
  // Seed manualRates from those so the override isn't lost when rates become a map.
  useEffect(() => {
    setSettings((prev) => {
      if (prev.manualRates || !prev.useManualRate) return prev;
      const manualRates: Partial<Record<Currency, number>> = {};
      if (typeof prev.exchangeRate === 'number' && prev.exchangeRate > 0) manualRates.USD = prev.exchangeRate;
      if (typeof prev.eurExchangeRate === 'number' && prev.eurExchangeRate > 0) manualRates.EUR = prev.eurExchangeRate;
      if (Object.keys(manualRates).length === 0) return prev;
      return { ...prev, manualRates };
    });
  }, [setSettings]);

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
