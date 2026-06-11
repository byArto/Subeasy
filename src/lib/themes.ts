export const VALID_THEMES = ['green', 'purple', 'blue', 'claude'] as const;

export type Theme = (typeof VALID_THEMES)[number];

/** Theme applied to everyone who hasn't explicitly chosen one. */
export const DEFAULT_THEME: Theme = 'claude';

export interface ThemeOption {
  value: Theme;
  label: string;
  key: string;
  color: string;
  proOnly: boolean;
}

export const THEME_META: Record<Theme, {
  surface: string;
  text: string;
  accent: string;
  themeColor: string;
  backgroundColor: string;
}> = {
  green: {
    surface: '#0A0A0F',
    text: '#F0F0F5',
    accent: '#00FF41',
    themeColor: '#00FF41',
    backgroundColor: '#0A0A0F',
  },
  purple: {
    surface: '#08070F',
    text: '#F0F0F5',
    accent: '#A855F7',
    themeColor: '#A855F7',
    backgroundColor: '#08070F',
  },
  blue: {
    surface: '#060B0F',
    text: '#F0F0F5',
    accent: '#06B6D4',
    themeColor: '#06B6D4',
    backgroundColor: '#060B0F',
  },
  claude: {
    surface: '#faf9f5',
    text: '#141413',
    accent: '#d97757',
    themeColor: '#faf9f5',
    backgroundColor: '#faf9f5',
  },
};

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'claude', label: 'Claude',          key: 'settings.themes.claude', color: '#d97757', proOnly: false },
  { value: 'green',  label: 'SubEasy Green', key: 'settings.themes.green',  color: '#00FF41', proOnly: false },
  { value: 'purple', label: 'Midnight Purple', key: 'settings.themes.purple', color: '#A855F7', proOnly: true },
  { value: 'blue',   label: 'Arctic Blue',     key: 'settings.themes.blue',   color: '#06B6D4', proOnly: true },
];

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.includes(value as Theme);
}

export function getThemeChrome(theme: Theme) {
  const meta = THEME_META[theme];
  return {
    themeColor: meta.themeColor,
    backgroundColor: meta.backgroundColor,
  };
}
