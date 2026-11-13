/**
 * useIsDarkTheme Hook
 *
 * Tracks whether the page is currently in dark mode by watching the `dark`
 * class on `document.documentElement`. This is distinct from
 * `usePrefersColorSchemeDark()` which monitors the OS-level preference;
 * this hook reflects the user's in-app toggle.
 *
 * Uses `useSyncExternalStore` for snapshot-consistent reads and to avoid the
 * extra render that the `useEffect + useState` pattern requires on mount.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isDark = useIsDarkTheme();
 *   return <div>{isDark ? 'Dark Mode' : 'Light Mode'}</div>;
 * }
 * ```
 */

import { useSyncExternalStore } from 'react';

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        callback();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return () => observer.disconnect();
}

/**
 * Hook for detecting current page theme.
 *
 * @returns Whether the page is currently in dark mode
 */
export function useIsDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
