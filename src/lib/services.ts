/**
 * Popular subscription services catalog.
 * categoryId references DEFAULT_CATEGORIES ids from constants.ts:
 * 1=Стриминг, 2=Музыка, 3=Софт, 4=Облако, 5=Игры, 6=Обучение, 7=AI, 8=VPN, 9=Другое
 */

export interface ServiceTemplate {
  name: string;
  emoji: string;
  categoryId: string;
  defaultPrice: number;
  defaultCurrency: 'RUB' | 'USD';
  color: string;
  cycle: 'monthly' | 'yearly';
  domain?: string;
}

/** Build a logo URL from domain using Google's high-res favicon service */
export function getLogoUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** Lookup domain by service name (case-insensitive) */
export function getServiceDomain(name: string): string | undefined {
  const q = name.toLowerCase().trim();
  const svc = SERVICE_CATALOG.find((s) => s.name.toLowerCase() === q);
  return svc?.domain;
}

export const SERVICE_CATALOG: ServiceTemplate[] = [
  // ── Стриминг ──
  { name: 'Netflix', emoji: '📺', categoryId: '1', defaultPrice: 1190, defaultCurrency: 'RUB', color: '#E50914', cycle: 'monthly', domain: 'netflix.com' },
  { name: 'YouTube Premium', emoji: '▶️', categoryId: '1', defaultPrice: 399, defaultCurrency: 'RUB', color: '#FF0000', cycle: 'monthly', domain: 'youtube.com' },
  { name: 'Кинопоиск', emoji: '🎬', categoryId: '1', defaultPrice: 299, defaultCurrency: 'RUB', color: '#FF6600', cycle: 'monthly', domain: 'kinopoisk.ru' },
  { name: 'Иви', emoji: '🎥', categoryId: '1', defaultPrice: 399, defaultCurrency: 'RUB', color: '#00B4E6', cycle: 'monthly', domain: 'ivi.ru' },
  { name: 'Okko', emoji: '🎞️', categoryId: '1', defaultPrice: 299, defaultCurrency: 'RUB', color: '#6B2FA0', cycle: 'monthly', domain: 'okko.tv' },
  { name: 'Wink', emoji: '📡', categoryId: '1', defaultPrice: 299, defaultCurrency: 'RUB', color: '#8B00FF', cycle: 'monthly', domain: 'wink.ru' },
  { name: 'Disney+', emoji: '🏰', categoryId: '1', defaultPrice: 9, defaultCurrency: 'USD', color: '#0063E5', cycle: 'monthly', domain: 'disneyplus.com' },
  { name: 'HBO Max', emoji: '📺', categoryId: '1', defaultPrice: 16, defaultCurrency: 'USD', color: '#5822B4', cycle: 'monthly', domain: 'max.com' },
  { name: 'Apple TV+', emoji: '🍎', categoryId: '1', defaultPrice: 9, defaultCurrency: 'USD', color: '#2D2D2D', cycle: 'monthly', domain: 'tv.apple.com' },
  { name: 'Crunchyroll', emoji: '🍙', categoryId: '1', defaultPrice: 8, defaultCurrency: 'USD', color: '#F47521', cycle: 'monthly', domain: 'crunchyroll.com' },
  { name: 'Twitch', emoji: '🟣', categoryId: '1', defaultPrice: 5, defaultCurrency: 'USD', color: '#9146FF', cycle: 'monthly', domain: 'twitch.tv' },
  { name: 'MEGOGO', emoji: '📺', categoryId: '1', defaultPrice: 219, defaultCurrency: 'RUB', color: '#1DB954', cycle: 'monthly', domain: 'megogo.net' },
  { name: 'START', emoji: '🎬', categoryId: '1', defaultPrice: 399, defaultCurrency: 'RUB', color: '#FF4444', cycle: 'monthly', domain: 'start.ru' },

  // ── Музыка ──
  { name: 'Spotify', emoji: '🎵', categoryId: '2', defaultPrice: 11, defaultCurrency: 'USD', color: '#1DB954', cycle: 'monthly', domain: 'spotify.com' },
  { name: 'Apple Music', emoji: '🎵', categoryId: '2', defaultPrice: 11, defaultCurrency: 'USD', color: '#FA2D48', cycle: 'monthly', domain: 'music.apple.com' },
  { name: 'Яндекс Музыка', emoji: '🎶', categoryId: '2', defaultPrice: 299, defaultCurrency: 'RUB', color: '#FFCC00', cycle: 'monthly', domain: 'music.yandex.ru' },
  { name: 'VK Музыка', emoji: '🎧', categoryId: '2', defaultPrice: 249, defaultCurrency: 'RUB', color: '#0077FF', cycle: 'monthly', domain: 'vk.com' },
  { name: 'Звук', emoji: '🔊', categoryId: '2', defaultPrice: 249, defaultCurrency: 'RUB', color: '#00C8FF', cycle: 'monthly', domain: 'zvuk.com' },
  { name: 'Tidal', emoji: '🌊', categoryId: '2', defaultPrice: 11, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'tidal.com' },
  { name: 'Deezer', emoji: '🎵', categoryId: '2', defaultPrice: 11, defaultCurrency: 'USD', color: '#A238FF', cycle: 'monthly', domain: 'deezer.com' },
  { name: 'SoundCloud Go', emoji: '☁️', categoryId: '2', defaultPrice: 10, defaultCurrency: 'USD', color: '#FF5500', cycle: 'monthly', domain: 'soundcloud.com' },

  // ── Софт ──
  { name: 'Microsoft 365', emoji: '💼', categoryId: '3', defaultPrice: 10, defaultCurrency: 'USD', color: '#0078D4', cycle: 'monthly', domain: 'microsoft.com' },
  { name: 'Adobe Creative Cloud', emoji: '🎨', categoryId: '3', defaultPrice: 55, defaultCurrency: 'USD', color: '#FF0000', cycle: 'monthly', domain: 'adobe.com' },
  { name: 'Figma', emoji: '🎨', categoryId: '3', defaultPrice: 15, defaultCurrency: 'USD', color: '#A259FF', cycle: 'monthly', domain: 'figma.com' },
  { name: 'Notion', emoji: '📝', categoryId: '3', defaultPrice: 10, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'notion.so' },
  { name: 'Todoist', emoji: '✅', categoryId: '3', defaultPrice: 5, defaultCurrency: 'USD', color: '#E44332', cycle: 'monthly', domain: 'todoist.com' },
  { name: '1Password', emoji: '🔑', categoryId: '3', defaultPrice: 3, defaultCurrency: 'USD', color: '#0572EC', cycle: 'monthly', domain: '1password.com' },
  { name: 'Canva Pro', emoji: '🖼️', categoryId: '3', defaultPrice: 13, defaultCurrency: 'USD', color: '#00C4CC', cycle: 'monthly', domain: 'canva.com' },
  { name: 'Slack', emoji: '💬', categoryId: '3', defaultPrice: 8, defaultCurrency: 'USD', color: '#4A154B', cycle: 'monthly', domain: 'slack.com' },
  { name: 'Zoom', emoji: '📹', categoryId: '3', defaultPrice: 14, defaultCurrency: 'USD', color: '#2D8CFF', cycle: 'monthly', domain: 'zoom.us' },
  { name: 'GitHub Pro', emoji: '🐙', categoryId: '3', defaultPrice: 4, defaultCurrency: 'USD', color: '#2D2D2D', cycle: 'monthly', domain: 'github.com' },
  { name: 'Grammarly', emoji: '📝', categoryId: '3', defaultPrice: 12, defaultCurrency: 'USD', color: '#15C39A', cycle: 'monthly', domain: 'grammarly.com' },
  { name: 'Linear', emoji: '🔷', categoryId: '3', defaultPrice: 8, defaultCurrency: 'USD', color: '#5E6AD2', cycle: 'monthly', domain: 'linear.app' },

  // ── Облако ──
  { name: 'iCloud+', emoji: '☁️', categoryId: '4', defaultPrice: 99, defaultCurrency: 'RUB', color: '#3395FF', cycle: 'monthly', domain: 'icloud.com' },
  { name: 'Google One', emoji: '☁️', categoryId: '4', defaultPrice: 139, defaultCurrency: 'RUB', color: '#4285F4', cycle: 'monthly', domain: 'one.google.com' },
  { name: 'Dropbox Plus', emoji: '📦', categoryId: '4', defaultPrice: 12, defaultCurrency: 'USD', color: '#0061FF', cycle: 'monthly', domain: 'dropbox.com' },
  { name: 'Яндекс 360', emoji: '☁️', categoryId: '4', defaultPrice: 199, defaultCurrency: 'RUB', color: '#FC3F1D', cycle: 'monthly', domain: '360.yandex.ru' },
  { name: 'Mail.ru Облако', emoji: '☁️', categoryId: '4', defaultPrice: 149, defaultCurrency: 'RUB', color: '#005FF9', cycle: 'monthly', domain: 'cloud.mail.ru' },

  // ── Игры ──
  { name: 'PlayStation Plus', emoji: '🎮', categoryId: '5', defaultPrice: 650, defaultCurrency: 'RUB', color: '#003791', cycle: 'monthly', domain: 'playstation.com' },
  { name: 'Xbox Game Pass', emoji: '🎮', categoryId: '5', defaultPrice: 10, defaultCurrency: 'USD', color: '#107C10', cycle: 'monthly', domain: 'xbox.com' },
  { name: 'Nintendo Switch Online', emoji: '🕹️', categoryId: '5', defaultPrice: 4, defaultCurrency: 'USD', color: '#E60012', cycle: 'monthly', domain: 'nintendo.com' },
  { name: 'EA Play', emoji: '🎮', categoryId: '5', defaultPrice: 5, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'ea.com' },
  { name: 'GeForce NOW', emoji: '🖥️', categoryId: '5', defaultPrice: 999, defaultCurrency: 'RUB', color: '#76B900', cycle: 'monthly', domain: 'nvidia.com' },
  { name: 'Steam (кошелёк)', emoji: '🎮', categoryId: '5', defaultPrice: 500, defaultCurrency: 'RUB', color: '#1B2838', cycle: 'monthly', domain: 'store.steampowered.com' },

  // ── Обучение ──
  { name: 'Duolingo Plus', emoji: '🦉', categoryId: '6', defaultPrice: 8, defaultCurrency: 'USD', color: '#58CC02', cycle: 'monthly', domain: 'duolingo.com' },
  { name: 'Skillbox', emoji: '📚', categoryId: '6', defaultPrice: 3490, defaultCurrency: 'RUB', color: '#FF5C35', cycle: 'monthly', domain: 'skillbox.ru' },
  { name: 'Coursera Plus', emoji: '🎓', categoryId: '6', defaultPrice: 59, defaultCurrency: 'USD', color: '#0056D2', cycle: 'monthly', domain: 'coursera.org' },
  { name: 'Яндекс Практикум', emoji: '📖', categoryId: '6', defaultPrice: 6500, defaultCurrency: 'RUB', color: '#FC3F1D', cycle: 'monthly', domain: 'practicum.yandex.ru' },
  { name: 'LeetCode Premium', emoji: '💡', categoryId: '6', defaultPrice: 35, defaultCurrency: 'USD', color: '#FFA116', cycle: 'monthly', domain: 'leetcode.com' },
  { name: 'Brilliant', emoji: '✨', categoryId: '6', defaultPrice: 25, defaultCurrency: 'USD', color: '#00A86B', cycle: 'monthly', domain: 'brilliant.org' },
  { name: 'MasterClass', emoji: '🎓', categoryId: '6', defaultPrice: 10, defaultCurrency: 'USD', color: '#2D2D2D', cycle: 'monthly', domain: 'masterclass.com' },
  { name: 'Lingualeo', emoji: '🦁', categoryId: '6', defaultPrice: 499, defaultCurrency: 'RUB', color: '#FFB800', cycle: 'monthly', domain: 'lingualeo.com' },

  // ── AI ──
  { name: 'ChatGPT Plus', emoji: '🤖', categoryId: '7', defaultPrice: 20, defaultCurrency: 'USD', color: '#10A37F', cycle: 'monthly', domain: 'openai.com' },
  { name: 'Claude Pro', emoji: '🤖', categoryId: '7', defaultPrice: 20, defaultCurrency: 'USD', color: '#D4A574', cycle: 'monthly', domain: 'claude.ai' },
  { name: 'Midjourney', emoji: '🎨', categoryId: '7', defaultPrice: 10, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'midjourney.com' },
  { name: 'GitHub Copilot', emoji: '🤖', categoryId: '7', defaultPrice: 10, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'github.com' },
  { name: 'Perplexity Pro', emoji: '🔍', categoryId: '7', defaultPrice: 20, defaultCurrency: 'USD', color: '#1B9AAA', cycle: 'monthly', domain: 'perplexity.ai' },
  { name: 'Cursor Pro', emoji: '⌨️', categoryId: '7', defaultPrice: 20, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'cursor.com' },
  { name: 'Runway', emoji: '🎬', categoryId: '7', defaultPrice: 12, defaultCurrency: 'USD', color: '#0000FF', cycle: 'monthly', domain: 'runwayml.com' },
  { name: 'ElevenLabs', emoji: '🔊', categoryId: '7', defaultPrice: 5, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'elevenlabs.io' },
  { name: 'Suno', emoji: '🎵', categoryId: '7', defaultPrice: 10, defaultCurrency: 'USD', color: '#000000', cycle: 'monthly', domain: 'suno.com' },

  // ── VPN / Proxy ──
  { name: 'NordVPN', emoji: '🔒', categoryId: '8', defaultPrice: 13, defaultCurrency: 'USD', color: '#4687FF', cycle: 'monthly', domain: 'nordvpn.com' },
  { name: 'ExpressVPN', emoji: '🔒', categoryId: '8', defaultPrice: 13, defaultCurrency: 'USD', color: '#DA3940', cycle: 'monthly', domain: 'expressvpn.com' },
  { name: 'Surfshark', emoji: '🦈', categoryId: '8', defaultPrice: 13, defaultCurrency: 'USD', color: '#178BF1', cycle: 'monthly', domain: 'surfshark.com' },
  { name: 'Kaspersky', emoji: '🛡️', categoryId: '8', defaultPrice: 999, defaultCurrency: 'RUB', color: '#006D5C', cycle: 'yearly', domain: 'kaspersky.com' },
  { name: 'Mullvad VPN', emoji: '🔒', categoryId: '8', defaultPrice: 5, defaultCurrency: 'USD', color: '#294D73', cycle: 'monthly', domain: 'mullvad.net' },

  // ── Другое / Подписки ──
  { name: 'Яндекс Плюс', emoji: '⭐', categoryId: '9', defaultPrice: 399, defaultCurrency: 'RUB', color: '#FC3F1D', cycle: 'monthly', domain: 'plus.yandex.ru' },
  { name: 'СберПрайм', emoji: '💚', categoryId: '9', defaultPrice: 399, defaultCurrency: 'RUB', color: '#21A038', cycle: 'monthly', domain: 'sberbank.ru' },
  { name: 'Ozon Premium', emoji: '📦', categoryId: '9', defaultPrice: 299, defaultCurrency: 'RUB', color: '#005BFF', cycle: 'monthly', domain: 'ozon.ru' },
  { name: 'Wildberries', emoji: '🛒', categoryId: '9', defaultPrice: 199, defaultCurrency: 'RUB', color: '#CB11AB', cycle: 'monthly', domain: 'wildberries.ru' },
  { name: 'Telegram Premium', emoji: '✈️', categoryId: '9', defaultPrice: 299, defaultCurrency: 'RUB', color: '#2AABEE', cycle: 'monthly', domain: 'telegram.org' },
  { name: 'Amazon Prime', emoji: '📦', categoryId: '9', defaultPrice: 15, defaultCurrency: 'USD', color: '#FF9900', cycle: 'monthly', domain: 'amazon.com' },
  { name: 'Patreon', emoji: '❤️', categoryId: '9', defaultPrice: 5, defaultCurrency: 'USD', color: '#FF424D', cycle: 'monthly', domain: 'patreon.com' },
  { name: 'Boosty', emoji: '🚀', categoryId: '9', defaultPrice: 249, defaultCurrency: 'RUB', color: '#F15F2C', cycle: 'monthly', domain: 'boosty.to' },
  { name: 'Фитнес клуб', emoji: '💪', categoryId: '9', defaultPrice: 3000, defaultCurrency: 'RUB', color: '#FF2D55', cycle: 'monthly' },
  { name: 'Домашний интернет', emoji: '🌐', categoryId: '9', defaultPrice: 800, defaultCurrency: 'RUB', color: '#007AFF', cycle: 'monthly' },
  { name: 'Мобильная связь', emoji: '📱', categoryId: '9', defaultPrice: 500, defaultCurrency: 'RUB', color: '#34C759', cycle: 'monthly' },
];

/** Search services by name (case-insensitive, partial match) */
export function searchServices(query: string): ServiceTemplate[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  return SERVICE_CATALOG.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
}
