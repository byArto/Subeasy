'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TelegramUser } from '@/hooks/useTelegram';

interface TelegramContextValue {
  isTelegram: boolean;
  user: TelegramUser | undefined;
  /** Pixels to pad from top when in Telegram fullscreen (Telegram overlay height) */
  safeAreaTop: number;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  user: undefined,
  safeAreaTop: 0,
});

export function useTelegramContext() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [user, setUser] = useState<TelegramUser | undefined>(undefined);
  const [safeAreaTop, setSafeAreaTop] = useState(0);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp || !webApp.initData) return;

    setIsTelegram(true);
    setUser(webApp.initDataUnsafe?.user);

    webApp.ready();
    webApp.expand();

    try {
      webApp.setHeaderColor('#0A0A0F');
      webApp.setBackgroundColor('#0A0A0F');
    } catch {
      // older Telegram versions may not support this
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (webApp as any).requestFullscreen?.();
    } catch {
      // not supported in this Telegram version
    }

    // Read current safe area insets from Telegram.
    // In fullscreen mode, contentSafeAreaInset.top = height of Telegram's
    // overlay controls ("Закрыть" button etc.) that cover our content.
    // safeAreaInset.top = device status bar height.
    // We use the larger value to ensure nothing is hidden under Telegram chrome.
    const readInsets = () => {
      const content = webApp.contentSafeAreaInset?.top ?? 0;
      const device = webApp.safeAreaInset?.top ?? 0;
      const top = Math.max(content, device);
      if (top > 0) setSafeAreaTop(top);
    };

    // Listen to Telegram events — fires when fullscreen activates / insets change
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tgEvents = (webApp as any);
    try {
      tgEvents.onEvent?.('safeAreaChanged', readInsets);
      tgEvents.onEvent?.('contentSafeAreaChanged', readInsets);
      tgEvents.onEvent?.('viewportChanged', readInsets);
    } catch { /* older Telegram */ }

    // Also poll at intervals — some Telegram versions fire events late
    readInsets();
    const t1 = setTimeout(readInsets, 100);
    const t2 = setTimeout(readInsets, 500);
    const t3 = setTimeout(readInsets, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      try {
        tgEvents.offEvent?.('safeAreaChanged', readInsets);
        tgEvents.offEvent?.('contentSafeAreaChanged', readInsets);
        tgEvents.offEvent?.('viewportChanged', readInsets);
      } catch { /* ignore */ }
    };
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, user, safeAreaTop }}>
      {children}
    </TelegramContext.Provider>
  );
}
