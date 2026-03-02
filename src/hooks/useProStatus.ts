'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';

export interface ProStatus {
  isPro: boolean;
  proUntil: Date | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useProStatus(): ProStatus {
  const { user, loading: authLoading } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [proUntil, setProUntil] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Pure fetch — doesn't care about authLoading, used for manual refresh too
  const doFetch = useCallback(async () => {
    if (!user) {
      setIsPro(false);
      setProUntil(null);
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('is_pro, pro_until')
        .eq('id', user.id)
        .single();

      if (data) {
        const until = data.pro_until ? new Date(data.pro_until) : null;
        const active = data.is_pro && (!until || until > new Date());
        setIsPro(active);
        setProUntil(until);
      } else {
        setIsPro(false);
        setProUntil(null);
      }
    } catch {
      setIsPro(false);
      setProUntil(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Don't fetch while auth session is still restoring — prevents false "isPro=false"
    // flash when user IS pro but getSession() hasn't resolved yet
    if (authLoading) return;
    setLoading(true);
    doFetch();
  }, [doFetch, authLoading]);

  return { isPro, proUntil, loading, refresh: doFetch };
}
