'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useTelegramContext } from '@/components/providers/TelegramProvider';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * When the user opens the Mini App while logged in,
 * saves their Telegram chat_id via server API (bypasses RLS)
 * and current language to Supabase so the notification cron can reach them.
 */
export function useSaveTelegramChatId() {
  const { isTelegram, user: tgUser } = useTelegramContext();
  const { user: supabaseUser } = useAuth();
  const savedRef = useRef(false);

  useEffect(() => {
    if (!isTelegram || !tgUser?.id || !supabaseUser || savedRef.current) return;
    savedRef.current = true;

    const supabase = createClient();
    const lang =
      typeof window !== 'undefined'
        ? (localStorage.getItem('neonsub-language') ?? 'ru')
        : 'ru';

    // Save telegram_chat_id via server endpoint (service_role bypasses RLS)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      fetch('/api/telegram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ initData: window.Telegram?.WebApp?.initData }),
      }).catch((err) => console.warn('[useSaveTelegramChatId] connect:', err));
    });

    // Save current language to user_settings (only this column, no overwrite of others)
    supabase
      .from('user_settings')
      .upsert({ user_id: supabaseUser.id, lang }, { onConflict: 'user_id' })
      .then(({ error }) => {
        if (error) console.warn('[useSaveTelegramChatId] user_settings lang:', error.message);
      });
  }, [isTelegram, tgUser?.id, supabaseUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
