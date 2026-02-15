'use client';

import { useEffect } from 'react';

/**
 * iOS PWA standalone mode viewport fix.
 *
 * In standalone PWA mode on iOS, `position: fixed; bottom: 0` and
 * `env(safe-area-inset-bottom)` can behave differently than in a
 * regular Safari tab — the app viewport may not extend to the
 * physical bottom of the screen, leaving a black gap below the TabBar.
 *
 * This hook:
 * 1. Detects standalone mode (navigator.standalone or display-mode: standalone)
 * 2. Adds `ios-standalone` class to <html> for CSS targeting
 * 3. Sets `--app-height` CSS variable to window.innerHeight (actual pixels)
 * 4. Listens for resize/orientationchange to keep it in sync
 */
export function useIOSViewportFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (!isStandalone) return;

    const root = document.documentElement;
    root.classList.add('ios-standalone');

    function setAppHeight() {
      // window.innerHeight returns the actual visible viewport height in pixels,
      // which in standalone may differ from 100vh / 100dvh
      root.style.setProperty('--app-height', `${window.innerHeight}px`);
    }

    setAppHeight();

    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', () => {
      // iOS needs a short delay after orientation change
      setTimeout(setAppHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', setAppHeight);
      root.classList.remove('ios-standalone');
      root.style.removeProperty('--app-height');
    };
  }, []);
}
