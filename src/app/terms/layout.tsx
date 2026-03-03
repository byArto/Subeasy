'use client';

import { useEffect } from 'react';

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (window as { __removeSplash?: () => void }).__removeSplash?.();
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    const appShell = document.querySelector('.app-shell') as HTMLElement | null;
    if (appShell) {
      appShell.style.overflow = 'auto';
      appShell.style.height = 'auto';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      if (appShell) {
        appShell.style.overflow = '';
        appShell.style.height = '';
      }
    };
  }, []);

  return <>{children}</>;
}
