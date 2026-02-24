'use client';

import { createContext, useContext, useState, useCallback } from 'react';
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
  if (typeof window === 'undefined') return 'ru';
  const saved = window.localStorage.getItem('neonsub-language') as Lang;
  return VALID_LANGS.includes(saved) ? saved : 'ru';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem('neonsub-language', l);
  }, []);

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
