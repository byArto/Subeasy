'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getThemeChrome, isValidTheme, Theme } from '@/lib/themes';

export type { Theme };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const THEME_STORAGE_KEY = 'subeasy-theme';
const LEGACY_THEME_STORAGE_KEY = 'neonsub-theme';

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'green',
  setTheme: () => {},
});

function applyTheme(t: Theme) {
  if (t === 'green') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = t;
  }

  const chrome = getThemeChrome(t);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  themeMeta?.setAttribute('content', chrome.themeColor);

  try {
    const webApp = window.Telegram?.WebApp;
    webApp?.setHeaderColor(chrome.backgroundColor);
    webApp?.setBackgroundColor(chrome.backgroundColor);
  } catch {
    // Older Telegram clients may reject light colors.
  }
}

function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return isValidTheme(saved) ? saved : 'green';
  } catch {
    return 'green';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('green');

  // Sync from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
