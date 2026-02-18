'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TelegramUser } from '@/hooks/useTelegram';

interface TelegramContextValue {
  isTelegram: boolean;
  user: TelegramUser | undefined;
  /** Pixels to pad from top when in Telegram (Telegram header height + device status bar) */
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

    // Match Telegram header/bg to our exact surface color (#0A0A0F = --color-surface)
    try {
      webApp.setHeaderColor('#0A0A0F');
      webApp.setBackgroundColor('#0A0A0F');
    } catch {
      // older Telegram versions may not support this
    }

    // requestFullscreen() (Telegram v8+): makes the app cover the full screen
    // including under the Telegram header bar — eliminates the visual gap entirely.
    // contentSafeAreaInset.top tells us how many px the Telegram header occupies
    // so we can offset our content correctly.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (webApp as any).requestFullscreen?.();
    } catch {
      // not supported — expand() already called above as fallback
    }

    // Give Telegram a moment to apply fullscreen + compute insets
    const applyInsets = () => {
      const contentInset = webApp.contentSafeAreaInset?.top ?? 0;
      const deviceInset = webApp.safeAreaInset?.top ?? 0;
      // Use the larger of the two to ensure content is never hidden under chrome
      setSafeAreaTop(Math.max(contentInset, deviceInset));
    };

    applyInsets();
    // Re-check after a short delay (insets may update after fullscreen activates)
    const t = setTimeout(applyInsets, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, user, safeAreaTop }}>
      {children}
    </TelegramContext.Provider>
  );
}
