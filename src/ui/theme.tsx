import { useSyncExternalStore } from 'react';

/** Same key and attribute as the client portal's toggle (src/cxo/components/ui/theme-toggle.tsx), so one choice covers the whole app. */
const STORAGE_KEY = 'mettus-theme';
type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();
const readTheme = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* private browsing: the choice just won't persist */ }
  listeners.forEach((l) => l());
}

export const useTheme = (): Theme => useSyncExternalStore(subscribe, readTheme);

export function ThemeToggle({ className = 'icon-btn' }: { className?: string }) {
  const theme = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className={className} onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={label} title={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
          </>
        ) : (
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}
