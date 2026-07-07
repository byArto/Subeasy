import type { CSSProperties, ReactNode } from 'react';

/**
 * SubEasy line-icon set ("variant A"): a soft colour-tinted squircle with a
 * thin line glyph in the same hue. Self-contained (its own tint + hairline), so
 * it reads correctly on BOTH the cream light theme and the dark theme without
 * any per-theme overrides. Vector — crisp at any size, no image assets.
 */
export type AppIconName =
  | 'budget' | 'inactive' | 'duplicates' | 'diversify' | 'trials' | 'annual'
  | 'family' | 'bell' | 'analytics' | 'themes' | 'reports' | 'ai' | 'success'
  | 'nobank' | 'free' | 'offline' | 'search' | 'sprout' | 'target' | 'medal'
  | 'folder' | 'repeat' | 'card' | 'bank'
  // category glyphs
  | 'film' | 'music' | 'code' | 'cloud' | 'gamepad' | 'education' | 'phone'
  | 'heart' | 'food' | 'cart' | 'newspaper' | 'server' | 'box' | 'lock';

const GLYPHS: Record<AppIconName, ReactNode> = {
  budget: <><path d="M3.5 8A2.5 2.5 0 0 1 6 5.5h11A2 2 0 0 1 19 7.5H6.2a.7.7 0 0 0-.7.7V16a1.5 1.5 0 0 0 1.5 1.5h11A1 1 0 0 0 19 16.5v-1.2h-3.4a2.3 2.3 0 0 1 0-4.6H19V9.5" /><path d="M15.8 12.9h.01" /></>,
  inactive: <><path d="M20.5 14.2A8 8 0 0 1 9.8 3.5a8 8 0 1 0 10.7 10.7z" /><path d="M15 4h4M15 4l4 4" /></>,
  duplicates: <><rect x="8.2" y="8.2" width="11.6" height="11.6" rx="2.4" /><path d="M15.8 8.2V6.4a2 2 0 0 0-2-2H6.4a2 2 0 0 0-2 2v7.4a2 2 0 0 0 2 2H8.2" /></>,
  diversify: <><circle cx="12" cy="12" r="8.3" /><path d="M12 3.7v8.3l7.2 4.1" /></>,
  trials: <><path d="M9 3.5h6" /><path d="M10 3.5v5.2L5.6 16.4A2 2 0 0 0 7.4 19.5h9.2a2 2 0 0 0 1.8-3.1L14 8.7V3.5" /><path d="M8.4 14.2h7.2" /></>,
  annual: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.4" /><path d="M3.5 9.6h17M8.2 3v4M15.8 3v4" /><path d="M9 14.6l2 2 3.6-3.7" /></>,
  family: <><circle cx="8" cy="7.6" r="2.5" /><path d="M3.5 18.5v-1a4.5 4.5 0 0 1 9 0v1" /><circle cx="16.4" cy="8.8" r="2.1" /><path d="M14 18.5v-1a3.8 3.8 0 0 1 6.5-2.6" /></>,
  bell: <><path d="M6 9.3a6 6 0 0 1 12 0c0 4.6 2 5.9 2 5.9H4s2-1.3 2-5.9" /><path d="M10.2 19.4a2 2 0 0 0 3.6 0" /></>,
  analytics: <><path d="M4.5 20h15" /><path d="M7 20v-6M12 20V6M17 20v-9" /></>,
  themes: <><path d="M12 3.6a8.4 8.4 0 1 0 0 16.8 2.4 2.4 0 0 0 2.4-2.4c0-1.5 1-2 2.5-2A3.5 3.5 0 0 0 20.4 12 8.4 8.4 0 0 0 12 3.6z" /><circle cx="8.2" cy="10.2" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="15.6" cy="10.6" r="1" /></>,
  reports: <><path d="M13.6 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.9z" /><path d="M13.6 3.5V9h5.4" /><path d="M8.8 13h6.4M8.8 16.4h6.4" /></>,
  ai: <><rect x="4.5" y="8" width="15" height="11" rx="2.6" /><path d="M12 4.2v3.8M2.8 12.4v3M21.2 12.4v3" /><circle cx="9.3" cy="13.5" r=".9" /><circle cx="14.7" cy="13.5" r=".9" /><path d="M9.5 16.4h5" /></>,
  success: <><path d="M4 20l4.6-12.4 7.8 7.8z" /><path d="M8 8.2l1-1M13.6 4.8l1.2-2.3M17 8l2.3-1.1M18.6 12.4l2.4.2M15.6 15.4l1.6 1.6" /></>,
  nobank: <><path d="M12 3.2l7 3v5.2c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6.2z" /><path d="M9.2 12l2 2 3.8-4" /></>,
  free: <><rect x="4" y="9.4" width="16" height="10.6" rx="1.8" /><path d="M4 13.4h16M12 9.4V20" /><path d="M12 9.4C12 9.4 10.8 5 8.6 6.4S12 9.4 12 9.4zM12 9.4C12 9.4 13.2 5 15.4 6.4S12 9.4 12 9.4z" /></>,
  offline: <><path d="M3.5 3.5l17 17" /><path d="M9.4 16.8a3.4 3.4 0 0 1 5.2 0" /><path d="M6.4 13a7.5 7.5 0 0 1 4-2.2M17.6 13a7.5 7.5 0 0 0-3.2-2.5" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="M20 20l-4.7-4.7" /></>,
  sprout: <><path d="M12 20.5v-8" /><path d="M12 12.5C12 8.5 9 6.5 4.5 6.5c0 4 3 6 7.5 6z" /><path d="M12 13.5c0-3.2 2.6-4.8 6.5-4.8 0 3.6-2.8 4.8-6.5 4.8z" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r=".9" /></>,
  medal: <><circle cx="12" cy="14.5" r="5.3" /><path d="M9 10L7 3.2M15 10l2-6.8M9 3.2h6" /><path d="M12 12.4l.8 1.7 1.8.2-1.4 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2z" /></>,
  folder: <><path d="M3.5 7.8a2 2 0 0 1 2-2h3.3l1.7 2.1H18.5a2 2 0 0 1 2 2v6.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></>,
  repeat: <><path d="M4 10a6 6 0 0 1 10-4.4L16.8 8" /><path d="M17 4.4V8h-3.6" /><path d="M20 14a6 6 0 0 1-10 4.4L7.2 16" /><path d="M7 19.6V16h3.6" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2.4" /><path d="M3 10h18M6.5 14.5h4" /></>,
  bank: <><path d="M4 9.5 12 4l8 5.5" /><path d="M6 9.8V17M10 9.8V17M14 9.8V17M18 9.8V17M4.5 17.5h15" /></>,
  film: <><rect x="3" y="4.5" width="18" height="15" rx="2.4" /><path d="M7 4.5v15M17 4.5v15M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" /></>,
  music: <><path d="M9 18V6l10-2v10" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>,
  code: <><path d="M8.5 9 5 12.5 8.5 16M15.5 9l3.5 3.5-3.5 3.5M13 6.5l-2 11" /></>,
  cloud: <><path d="M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6 1.4A3.6 3.6 0 0 1 17 18z" /></>,
  gamepad: <><rect x="2.5" y="8" width="19" height="9" rx="4.5" /><path d="M7.5 11v3M6 12.5h3" /><circle cx="15.8" cy="11.8" r=".9" /><circle cx="18" cy="14" r=".9" /></>,
  education: <><path d="M12 4 2.5 8.5 12 13l9.5-4.5z" /><path d="M6 10.7V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.3" /><path d="M21.5 8.5v5" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.5h3" /></>,
  heart: <><path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.7 12 20 12 20z" /></>,
  food: <><path d="M4 11.5h16a8 8 0 0 0-16 0z" /><path d="M3.5 15h17M6.5 18.5h11" /></>,
  cart: <><circle cx="9.5" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M2.5 4h2.2l2.2 11a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" /></>,
  newspaper: <><path d="M4 5.5h13v13H5.5a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M17 8.5h3v8.5a1.5 1.5 0 0 1-1.5 1.5H17" /><path d="M7 9h7M7 12.5h7M7 16h4" /></>,
  server: <><rect x="3" y="4.5" width="18" height="6" rx="1.8" /><rect x="3" y="13.5" width="18" height="6" rx="1.8" /><path d="M6.5 7.5h.01M6.5 16.5h.01" /></>,
  box: <><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="M4 7l8 4 8-4M12 11.2V21" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><path d="M12 14.2v2.4" /></>,
};

interface AppIconProps {
  name: AppIconName;
  /** Hue for both the glyph line and the soft tinted tile. */
  color: string;
  /** Tile size in px. */
  size?: number;
  className?: string;
}

/**
 * Bare line glyph (no tile) — strokes in `currentColor` by default. Use inside
 * coloured pills, buttons and empty states where the icon should take the
 * surrounding text colour instead of sitting in its own tinted box.
 */
export function Glyph({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.85,
  className,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  const glyph: CSSProperties = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={glyph}>
      {GLYPHS[name]}
    </svg>
  );
}

export function AppIcon({ name, color, size = 40, className }: AppIconProps) {
  const tile: CSSProperties = {
    width: size,
    height: size,
    background: `color-mix(in srgb, ${color} 13%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 20%, transparent)`,
  };
  return (
    <span className={`grid place-items-center shrink-0 rounded-[30%] ${className ?? ''}`} style={tile}>
      <Glyph name={name} color={color} size={size * 0.52} />
    </span>
  );
}
