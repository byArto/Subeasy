// Telegram HapticFeedback utility
// Works only inside Telegram Mini App — silently no-ops in browser/PWA.

const hf = () => window.Telegram?.WebApp?.HapticFeedback;

export const haptic = {
  tap:     () => hf()?.impactOccurred('light'),
  medium:  () => hf()?.impactOccurred('medium'),
  success: () => hf()?.notificationOccurred('success'),
  error:   () => hf()?.notificationOccurred('error'),
  warning: () => hf()?.notificationOccurred('warning'),
};
