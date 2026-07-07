import type { AppIconName } from '@/components/ui/AppIcon';

/**
 * Default-category id → line-icon glyph (variant A). Custom (user-created)
 * categories are NOT in this map and fall back to their own emoji, so nothing
 * breaks for them. Ids match DEFAULT_CATEGORIES in lib/constants.ts.
 */
export const CATEGORY_GLYPH: Record<string, AppIconName> = {
  '1': 'film',        // Стриминг
  '2': 'music',       // Музыка
  '3': 'code',        // Софт
  '4': 'cloud',       // Облако
  '5': 'gamepad',     // Игры
  '6': 'education',   // Обучение
  '7': 'ai',          // AI
  '8': 'lock',        // VPN/Proxy
  '10': 'phone',      // Связь
  '11': 'heart',      // Здоровье и фитнес
  '12': 'food',       // Еда и доставка
  '13': 'budget',     // Финансы
  '14': 'cart',       // Шопинг
  '15': 'newspaper',  // Новости и чтение
  '16': 'server',     // Хостинг и домены
  '9': 'box',         // Другое
};

/** Returns the glyph for a default category, or null (→ render the emoji). */
export function getCategoryGlyph(categoryId: string | undefined): AppIconName | null {
  if (!categoryId) return null;
  return CATEGORY_GLYPH[categoryId] ?? null;
}
