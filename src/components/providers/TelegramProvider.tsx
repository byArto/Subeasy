'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TelegramUser } from '@/hooks/useTelegram';

interface TelegramContextValue {
  isTelegram: boolean;
  user: TelegramUser | undefined;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  user: undefined,
});

export function useTelegramContext() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [user, setUser] = useState<TelegramUser | undefined>(undefined);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp || !webApp.initData) return;

    setIsTelegram(true);
    setUser(webApp.initDataUnsafe?.user);

    webApp.ready();
    webApp.expand();

    try {
      webApp.setHeaderColor('#0A0A12');
      webApp.setBackgroundColor('#0A0A12');
    } catch {
      // older Telegram versions may not support this
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, user }}>
      {/* When inside Telegram, add safe-area padding at the top via CSS var */}
      {isTelegram && (
        <style>{`
          :root { --tg-safe-top: env(safe-area-inset-top, 0px); }
          .app-shell { padding-top: var(--tg-safe-top); }
        `}</style>
      )}
      {children}
    </TelegramContext.Provider>
  );
}
