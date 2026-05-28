'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReadState {
  readIds: string[];
  lastSeenAt: string | null;
}

const STORAGE_KEY = 'neonsub-notifications-read';

export function useNotificationRead() {
  const [readState, setReadState] = useState<ReadState>({
    readIds: [],
    lastSeenAt: null,
  });

  // Load from localStorage on mount. Done in an effect (not lazy useState init)
  // on purpose: it keeps the first client render identical to the server render
  // (empty default), avoiding a hydration mismatch, then syncs the persisted value.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.readIds)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe localStorage sync (first render matches SSR empty state)
        setReadState({ readIds: parsed.readIds, lastSeenAt: parsed.lastSeenAt ?? null });
      }
    } catch (err) {
      console.error('[useNotificationRead] failed to read stored state:', err);
    }
  }, []);

  const persist = useCallback((state: ReadState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, []);

  const markAsRead = useCallback((id: string) => {
    setReadState((prev) => {
      if (prev.readIds.includes(id)) return prev;
      const next = { ...prev, readIds: [...prev.readIds, id] };
      persist(next);
      return next;
    });
  }, [persist]);

  const markAllAsRead = useCallback((allIds: string[]) => {
    setReadState((prev) => {
      const merged = [...new Set([...prev.readIds, ...allIds])];
      const next: ReadState = { readIds: merged, lastSeenAt: new Date().toISOString() };
      persist(next);
      return next;
    });
  }, [persist]);

  const isRead = useCallback(
    (id: string): boolean => readState.readIds.includes(id),
    [readState.readIds],
  );

  const cleanup = useCallback(
    (currentIds: string[]) => {
      setReadState((prev) => {
        const filtered = prev.readIds.filter((id) => currentIds.includes(id));
        if (filtered.length === prev.readIds.length) return prev;
        const next = { ...prev, readIds: filtered };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { isRead, markAsRead, markAllAsRead, cleanup, readIds: readState.readIds };
}
