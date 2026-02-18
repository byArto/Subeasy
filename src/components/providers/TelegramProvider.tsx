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

function applyTelegramInsets() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return;

  // safeAreaInset.top      = device status bar height (notch / Dynamic Island)
  // contentSafeAreaInset.top = Telegram overlay controls height in fullscreen
  //                            (the "Закрыть" / "..." row on top of our content)
  // These are TWO SEPARATE values that must be SUMMED, not max'd.
  const device  = (webApp.safeAreaInset?.top         ?? 0);
  const content = (webApp.contentSafeAreaInset?.top   ?? 0);
  const total   = device + content;

  if (total > 0) {
    document.documentElement.style.setProperty('--tg-top-inset', `${total}px`);
    return;
  }

  // SDK вернул 0 (старый Telegram iOS или timing issue).
  // CSS fallback в globals.css даёт 119px (59+60), JS уточняет по высоте экрана.
  // window.screen.height в Safari iOS = CSS пиксели, не физические.
  const screenH = window.screen.height;
  const estimated = screenH >= 852 ? 103  // iPhone 14 Pro / 15 Pro (Dynamic Island ~59px)
                  : screenH >= 844 ? 100  // iPhone 14 / 13 (~47px notch)
                  : screenH >= 812 ?  88  // iPhone X / 11 / 12 / 13 mini (44px notch)
                  :                   72; // iPhone SE (20px status bar)
  document.documentElement.style.setProperty('--tg-top-inset', `${estimated}px`);
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
      webApp.setHeaderColor('#0A0A0F');
      webApp.setBackgroundColor('#0A0A0F');
    } catch { /* older Telegram */ }

    // Apply insets immediately, then listen to Telegram events for updates,
    // then retry at intervals — Telegram often delivers values with a delay.
    applyTelegramInsets();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = webApp as any;
    try {
      tg.onEvent?.('safeAreaChanged',        applyTelegramInsets);
      tg.onEvent?.('contentSafeAreaChanged', applyTelegramInsets);
      tg.onEvent?.('viewportChanged',        applyTelegramInsets);
    } catch { /* older Telegram */ }

    // Aggressive retry: covers late-arriving values from fullscreen activation
    const timers = [50, 150, 300, 600, 1200, 2500].map(
      (ms) => setTimeout(applyTelegramInsets, ms)
    );

    return () => {
      timers.forEach(clearTimeout);
      try {
        tg.offEvent?.('safeAreaChanged',        applyTelegramInsets);
        tg.offEvent?.('contentSafeAreaChanged', applyTelegramInsets);
        tg.offEvent?.('viewportChanged',        applyTelegramInsets);
      } catch { /* ignore */ }
    };
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, user }}>
      {children}
    </TelegramContext.Provider>
  );
}
