'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExchangeRate, refreshExchangeRate, getRateInfo } from '@/lib/exchange-rate';

export function useExchangeRate(currentRate: number) {
  const [rate, setRate] = useState(() => {
    // Return cached rate immediately (sync, no network)
    const info = getRateInfo();
    return info ? info.rate : currentRate;
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(() => {
    const info = getRateInfo();
    return info ? info.updatedAt : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const syncInfo = useCallback(() => {
    const info = getRateInfo();
    if (info) {
      setLastUpdated(info.updatedAt);
    }
  }, []);

  // Background refresh — deferred, non-blocking
  useEffect(() => {
    let cancelled = false;
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => {
          getExchangeRate(currentRate).then((freshRate) => {
            if (!cancelled) {
              setRate(freshRate);
              syncInfo();
            }
          });
        })
      : setTimeout(() => {
          getExchangeRate(currentRate).then((freshRate) => {
            if (!cancelled) {
              setRate(freshRate);
              syncInfo();
            }
          });
        }, 2000) as unknown as number;

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    const freshRate = await refreshExchangeRate(rate);
    setRate(freshRate);
    syncInfo();
    setIsLoading(false);
    return freshRate;
  }, [rate, syncInfo]);

  return { rate, lastUpdated, isLoading, refresh };
}
