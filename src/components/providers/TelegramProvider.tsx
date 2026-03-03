'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TelegramUser } from '@/hooks/useTelegram';

// TMA Analytics is loaded via CDN <script> tag in layout.tsx
// and initialized via onload callback (see layout.tsx <head>).

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

  // ── Desktop clients: never need overlay inset ─────────────────────────────
  // Telegram Desktop, macOS, and all web clients show a native title bar
  // *above* the WebView — no overlay controls → inset = 0.
  // platform values: 'tdesktop' | 'macos' | 'webk' | 'weba' | 'web' (desktop)
  //                  'ios' | 'android' | 'android_x'                (mobile)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platform: string = (webApp as any).platform ?? '';
  const isMobile = platform === 'ios' || platform.startsWith('android');
  if (platform && !isMobile) {
    document.documentElement.style.setProperty('--tg-top-inset', '0px');
    return;
  }

  // ── Режим: Fullsize vs Fullscreen ────────────────────────────────────────
  // Fullsize:    Telegram header — отдельный нативный бар над WebView.
  //             window.innerHeight < screen.height на ~88-103px.
  //             Overlay поверх контента отсутствует → отступ = 0.
  // Fullscreen: WebView = весь экран, Telegram controls — overlay.
  //             window.innerHeight ≈ screen.height (разница < 60px).
  //             Нужен отступ для overlay controls.
  // > 200px:    клавиатура открыта — не меняем режим.
  const heightDiff = window.screen.height - window.innerHeight;
  if (heightDiff > 60 && heightDiff < 200) {
    // Fullsize: header выше WebView, overlay-отступ не нужен
    document.documentElement.style.setProperty('--tg-top-inset', '0px');
    return;
  }

  // ── Fullscreen: считаем отступ для overlay controls ──────────────────────
  // safeAreaInset.top      = device status bar height (notch / Dynamic Island)
  // contentSafeAreaInset.top = Telegram overlay controls height
  const device  = (webApp.safeAreaInset?.top         ?? 0);
  const content = (webApp.contentSafeAreaInset?.top   ?? 0);
  const total   = device + content;

  if (total > 0) {
    document.documentElement.style.setProperty('--tg-top-inset', `${total}px`);
    return;
  }

  // SDK вернул 0 — heuristic по высоте экрана (CSS пиксели в Safari iOS).
  // Guard: heuristic valid only for iPhone-sized screens; large screens = desktop/tablet = 0.
  const screenH = window.screen.height;
  if (screenH > 950) {
    document.documentElement.style.setProperty('--tg-top-inset', '0px');
    return;
  }
  const estimated = screenH >= 852 ? 103  // iPhone 14 Pro / 15 Pro
                  : screenH >= 844 ? 100  // iPhone 14 / 13
                  : screenH >= 812 ?  88  // iPhone X / 11 / 12 / 13 mini
                  :                   72; // iPhone SE
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
