'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type SetValue<T> = T | ((prev: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  const hydrated = useRef(false);
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setStoredValue(JSON.parse(raw));
      }
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading "${key}":`, error);
    }
  }, [key]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setStoredValue(e.newValue !== null ? JSON.parse(e.newValue) : initialValue);
      } catch {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: SetValue<T>) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch (error) {
          console.warn(`[useLocalStorage] Error writing "${key}":`, error);
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[useLocalStorage] Error removing "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
