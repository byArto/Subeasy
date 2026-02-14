'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { soundEngine } from '@/lib/sounds';

// Simple external store for sound enabled state
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSound() {
  const enabled = useSyncExternalStore(
    subscribe,
    () => soundEngine.isEnabled(),
    () => true
  );

  const setEnabled = useCallback((val: boolean) => {
    soundEngine.setEnabled(val);
    listeners.forEach((cb) => cb());
  }, []);

  return {
    enabled,
    setEnabled,
    playTap: useCallback(() => soundEngine.tap(), []),
    playSuccess: useCallback(() => soundEngine.success(), []),
    playDelete: useCallback(() => soundEngine.remove(), []),
    playTabSwitch: useCallback(() => soundEngine.tabSwitch(), []),
    playPaid: useCallback(() => soundEngine.paid(), []),
  };
}
