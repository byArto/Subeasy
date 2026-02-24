import { Category, AppSettings } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Стриминг', emoji: '🎬', color: '#FF0000' },
  { id: '2', name: 'Музыка', emoji: '🎵', color: '#1DB954' },
  { id: '3', name: 'Софт', emoji: '💻', color: '#007AFF' },
  { id: '4', name: 'Облако', emoji: '☁️', color: '#5AC8FA' },
  { id: '5', name: 'Игры', emoji: '🎮', color: '#AF52DE' },
  { id: '6', name: 'Обучение', emoji: '📚', color: '#FF9500' },
  { id: '7', name: 'AI', emoji: '🤖', color: '#D4A574' },
  { id: '8', name: 'VPN/Proxy', emoji: '🔒', color: '#34C759' },
  { id: '9', name: 'Другое', emoji: '📦', color: '#8E8E93' },
];

/** Maps default category IDs to their translation keys */
export const DEFAULT_CATEGORY_NAME_KEYS: Record<string, string> = {
  '1': 'cat.streaming',
  '2': 'cat.music',
  '3': 'cat.software',
  '4': 'cat.cloud',
  '5': 'cat.games',
  '6': 'cat.education',
  '7': 'cat.ai',
  '8': 'cat.vpn',
  '9': 'cat.other',
};

export const DEFAULT_SETTINGS: AppSettings = {
  displayCurrency: 'RUB',
  exchangeRate: 96,
  eurExchangeRate: 105,
  useManualRate: false,
  notificationsEnabled: true,
  notifyDaysBefore: 3,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

export const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  weekly: 'Еженедельно',
  'one-time': 'Разовый',
  trial: 'Пробный',
};

export const PAYMENT_METHODS = [
  'Карта',
  'Крипто',
  'СБП',
  'Другое',
];
