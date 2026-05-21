export const THEME_STORAGE_KEY = 'assa-theme';

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
}

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(mode) {
  if (mode === 'system') return getSystemTheme();
  return mode === 'dark' ? 'dark' : 'light';
}

/** Apply light/dark class on <html> (tweakcn / shadcn pattern). */
export function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.add('theme');
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export function initThemeFromStorage() {
  applyTheme(getStoredTheme());
}
