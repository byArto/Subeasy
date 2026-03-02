'use client';

import { useEffect } from 'react';

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (window as { __removeSplash?: () => void }).__removeSplash?.();
  }, []);

  return <>{children}</>;
}
