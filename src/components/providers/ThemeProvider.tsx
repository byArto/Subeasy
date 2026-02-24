'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Theme = 'green' | 'purple' | 'blue';

const VALID_THEMES: Theme[] = ['green', 'purple', 'blue'];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

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
}

function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem('neonsub-theme') as Theme;
    return VALID_THEMES.includes(saved) ? saved : 'green';
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
      localStorage.setItem('neonsub-theme', t);
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
