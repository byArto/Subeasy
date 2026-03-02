'use client';

import { createContext, useContext } from 'react';
import { useProStatus } from '@/hooks/useProStatus';

interface ProContextType {
  isPro: boolean;
  proUntil: Date | null;
  loading: boolean;
  refreshProStatus: () => Promise<void>;
}

const ProContext = createContext<ProContextType | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const { isPro, proUntil, loading, refresh } = useProStatus();

  return (
    <ProContext.Provider value={{ isPro, proUntil, loading, refreshProStatus: refresh }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used within ProProvider');
  return ctx;
}
