'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';

export function TonConnectProvider({ children }: { children: React.ReactNode }) {
  return (
    <TonConnectUIProvider manifestUrl="https://www.subeasy.org/tonconnect-manifest.json">
      {children}
    </TonConnectUIProvider>
  );
}
