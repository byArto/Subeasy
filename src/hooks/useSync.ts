'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Subscription, Category, AppSettings } from '@/lib/types';
import {
  syncSubscriptions,
  syncCategories,
  syncSettings,
  pushSubscriptions,
  pushCategories,
  pushSettings,
} from '@/lib/sync';

interface SyncSetters {
  setSubscriptions: (subs: Subscription[]) => void;
  setCategories: (cats: Category[]) => void;
  setSettings: (settings: AppSettings) => void;
}

/**
 * Syncs localStorage data with Supabase when user is logged in.
 *
 * On login: pull from Supabase, merge with localStorage, update both.
 * On data change: debounce push to Supabase (1s).
 */
export function useSync(
  user: User | null,
  subscriptions: Subscription[],
  categories: Category[],
  settings: AppSettings,
  setters: SyncSetters
) {
  const initialSyncDone = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUser = useRef<string | null>(null);

  // Initial sync on login
  useEffect(() => {
    if (!user) {
      // If logging out from a real account, clear local data so next user starts clean
      if (prevUser.current !== null) {
        setters.setSubscriptions([]);
        setters.setCategories([]);
      }
      initialSyncDone.current = false;
      prevUser.current = null;
      return;
    }

    // Only sync once per user session
    if (prevUser.current === user.id) return;

    // Detect account switch (was logged in as a different user)
    const switchingAccounts = prevUser.current !== null;
    prevUser.current = user.id;

    async function doInitialSync() {
      try {
        // When switching accounts, never merge previous user's local data
        const localSubsToSync = switchingAccounts ? [] : subscriptions;
        const localCatsToSync = switchingAccounts ? [] : categories;

        const [mergedSubs, mergedCats, mergedSettings] = await Promise.all([
          syncSubscriptions(user!.id, localSubsToSync),
          syncCategories(user!.id, localCatsToSync),
          syncSettings(user!.id, settings),
        ]);

        setters.setSubscriptions(mergedSubs);
        setters.setCategories(mergedCats);
        setters.setSettings(mergedSettings);
        initialSyncDone.current = true;
      } catch (err) {
        console.warn('[useSync] initial sync failed:', err);
        initialSyncDone.current = true; // continue anyway with local data
      }
    }

    doInitialSync();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced push on data changes
  const debouncedPush = useCallback(() => {
    if (!user || !initialSyncDone.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);

    pushTimer.current = setTimeout(async () => {
      try {
        await Promise.all([
          pushSubscriptions(user.id, subscriptions),
          pushCategories(user.id, categories),
          pushSettings(user.id, settings),
        ]);
      } catch (err) {
        console.warn('[useSync] push failed:', err);
      }
    }, 1000);
  }, [user, subscriptions, categories, settings]);

  useEffect(() => {
    debouncedPush();
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [debouncedPush]);
}
