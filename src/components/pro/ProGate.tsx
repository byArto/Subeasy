'use client';

import { usePro } from '@/components/providers/ProProvider';

interface ProGateProps {
  children: React.ReactNode;
  /** What to show when user is not PRO. If omitted — renders nothing. */
  fallback?: React.ReactNode;
}

/**
 * Renders children only if user has PRO.
 * Use `fallback` to show a locked/paywall UI instead.
 *
 * Example:
 *   <ProGate fallback={<LockedCard onUpgrade={() => setProModalOpen(true)} />}>
 *     <MultiCurrencyPicker />
 *   </ProGate>
 */
export function ProGate({ children, fallback = null }: ProGateProps) {
  const { isPro, loading } = usePro();

  // While loading, render nothing to avoid flicker
  if (loading) return null;

  return isPro ? <>{children}</> : <>{fallback}</>;
}
