// Telegram HapticFeedback utility
// Works only inside Telegram Mini App — silently no-ops in browser/PWA.

function supportsHaptic(version?: string) {
  if (!version) return false;
  const [major = 0, minor = 0] = version.split('.').map((part) => Number(part));
  return major > 6 || (major === 6 && minor >= 1);
}

const hf = () => {
  const webApp = window.Telegram?.WebApp;
  if (!webApp || !supportsHaptic(webApp.version)) return undefined;
  return webApp.HapticFeedback;
};

export const haptic = {
  tap:     () => hf()?.impactOccurred('light'),
  medium:  () => hf()?.impactOccurred('medium'),
  success: () => hf()?.notificationOccurred('success'),
  error:   () => hf()?.notificationOccurred('error'),
  warning: () => hf()?.notificationOccurred('warning'),
};
