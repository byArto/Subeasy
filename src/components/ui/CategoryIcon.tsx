import { AppIcon, Glyph } from '@/components/ui/AppIcon';
import { getCategoryGlyph } from '@/lib/categoryIcons';

interface CategoryIconProps {
  id: string;
  color: string;
  emoji: string;
  size?: number;
  /**
   * boxed       → tinted square + coloured line (standalone slots, e.g. list rows)
   * line        → bare line in the category colour (breakdown rows)
   * lineCurrent → bare line in currentColor (inside coloured pills/chips)
   */
  variant?: 'boxed' | 'line' | 'lineCurrent';
  className?: string;
}

/**
 * Renders a category's icon: a custom variant-A glyph for the 16 default
 * categories, or the category's own emoji for user-created ones (nothing breaks
 * for custom categories).
 */
export function CategoryIcon({ id, color, emoji, size = 32, variant = 'boxed', className }: CategoryIconProps) {
  const g = getCategoryGlyph(id);
  if (!g) {
    return (
      <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }
  if (variant === 'boxed') return <AppIcon name={g} color={color} size={size} className={className} />;
  if (variant === 'lineCurrent') return <Glyph name={g} size={size} strokeWidth={2} className={className} />;
  return <Glyph name={g} color={color} size={size} strokeWidth={2} className={className} />;
}
