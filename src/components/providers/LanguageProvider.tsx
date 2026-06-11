'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translate, Lang } from '@/lib/translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const VALID_LANGS: Lang[] = ['ru', 'en', 'es', 'tr', 'de', 'kk', 'hy', 'pl'];

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key,
});

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';

  // 1. User's explicit saved choice takes priority
  const saved = window.localStorage.getItem('neonsub-language') as Lang;
  if (VALID_LANGS.includes(saved)) return saved;

  // 2. Detect from Telegram client language (required by Telegram App Centre)
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang) {
    const code = tgLang.split('-')[0] as Lang; // e.g. 'ru-RU' → 'ru'
    if (VALID_LANGS.includes(code)) return code;
  }

  // 3. Default to English (Telegram App Centre requirement)
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem('neonsub-language', l);
  }, []);

  // Keep <html lang> in sync with the rendered language. A mismatch (e.g. lang="en"
  // while showing Russian) makes Chrome auto-translate the page and mangle it
  // ("Telegram" → "Телеграмма", etc.). The app has its own i18n — this is the source of truth.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, lang, vars),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
