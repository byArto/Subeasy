'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Currency } from '@/lib/types';
import { getExchangeRate, refreshExchangeRate, getRateInfo } from '@/lib/exchange-rate';

type RateMap = Partial<Record<Currency, number>>;

export function useExchangeRate(initialRates: RateMap) {
  const [rates, setRates] = useState<RateMap>(() => {
    const info = getRateInfo();
    return info ? info.rates : initialRates;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => {
    const info = getRateInfo();
    return info ? info.updatedAt : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const syncInfo = useCallback(() => {
    const info = getRateInfo();
    if (info) setLastUpdated(info.updatedAt);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getExchangeRate().then((fresh) => {
        if (!cancelled) {
          setRates(fresh);
          syncInfo();
        }
      });
    };
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(load)
      : setTimeout(load, 2000) as unknown as number;

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const fresh = await refreshExchangeRate();
    setRates(fresh);
    syncInfo();
    setIsLoading(false);
    return fresh;
  }, [syncInfo]);

  return { rates, lastUpdated, isLoading, refresh };
}
