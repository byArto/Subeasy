'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExchangeRate, refreshExchangeRate, getRateInfo } from '@/lib/exchange-rate';

export function useExchangeRate(currentRate: number, currentEurRate: number) {
  const [rate, setRate] = useState(() => {
    const info = getRateInfo();
    return info ? info.rate : currentRate;
  });
  const [eurRate, setEurRate] = useState(() => {
    const info = getRateInfo();
    return info ? info.eurRate : currentEurRate;
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

  useEffect(() => {
    let cancelled = false;
    const id = typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(() => {
          getExchangeRate(currentRate).then((fresh) => {
            if (!cancelled) {
              setRate(fresh.rate);
              setEurRate(fresh.eurRate);
              syncInfo();
            }
          });
        })
      : setTimeout(() => {
          getExchangeRate(currentRate).then((fresh) => {
            if (!cancelled) {
              setRate(fresh.rate);
              setEurRate(fresh.eurRate);
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

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const fresh = await refreshExchangeRate(rate);
    setRate(fresh.rate);
    setEurRate(fresh.eurRate);
    syncInfo();
    setIsLoading(false);
    return fresh.rate;
  }, [rate, syncInfo]);

  return { rate, eurRate, lastUpdated, isLoading, refresh };
}
