'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExchangeRate, refreshExchangeRate, getRateInfo } from '@/lib/exchange-rate';

export function useExchangeRate(currentRate: number) {
  const [rate, setRate] = useState(currentRate);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncInfo = useCallback(() => {
    const info = getRateInfo();
    if (info) {
      setLastUpdated(info.updatedAt);
    }
  }, []);

  // Загрузка при маунте
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const freshRate = await getExchangeRate(currentRate);
      if (!cancelled) {
        setRate(freshRate);
        syncInfo();
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Принудительное обновление
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
