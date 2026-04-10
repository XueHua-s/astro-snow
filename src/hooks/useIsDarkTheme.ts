/**
 * useIsDarkTheme Hook
 *
 * Hook for detecting the current page theme state by monitoring
 * the `dark` class on `document.documentElement`.
 *
 * Note: This is different from `usePrefersColorSchemeDark()` which
 * monitors the user's system preference. This hook monitors the actual
 * page theme which can be manually toggled by the user.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isDark = useIsDarkTheme();
 *   return <div>{isDark ? 'Dark Mode' : 'Light Mode'}</div>;
 * }
 * ```
 */

import { useEffect, useState } from 'react';

/**
 * Hook for detecting current page theme
 *
 * @returns Whether the page is currently in dark mode
 */
export function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Initialize with current theme state
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };

    updateTheme();

    // Watch for class changes on documentElement
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          updateTheme();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
