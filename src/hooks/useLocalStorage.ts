'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type SetValue<T> = T | ((prev: T) => T);

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Capture initialValue once to avoid re-running the effect on every render
  // when the caller passes an inline object/array literal
  const initialRef = useRef(initialValue);

  const [storedValue, setStoredValue] = useState<T>(() => readStorage(key, initialRef.current));

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setStoredValue(e.newValue !== null ? JSON.parse(e.newValue) : initialRef.current);
      } catch {
        setStoredValue(initialRef.current);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

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
    setStoredValue(initialRef.current);
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[useLocalStorage] Error removing "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue, removeValue];
}
