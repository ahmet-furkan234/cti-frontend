export type Theme = 'dark' | 'light';
export const THEME_COOKIE = 'cti_theme';
export const DEFAULT_THEME: Theme = 'light';

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
