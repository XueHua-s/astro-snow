import { useMediaQuery as useCoreMediaQuery } from '@reactuses/core';

/**
 * Thin project-scoped wrapper around `@reactuses/core`'s `useMediaQuery`.
 * Returns `false` as the SSR/server snapshot, which prevents hydration
 * mismatches on queries that cannot be evaluated server-side.
 *
 * Prefer the named variants below (`useIsMobile`, `useIsTablet`, etc.) for
 * the breakpoints already defined in the design system.
 *
 * @param query - A valid CSS media query string, e.g. "(max-width: 768px)"
 * @returns `true` while the query matches; `false` otherwise (including SSR)
 */
export function useMediaQuery(query: string): boolean {
  return useCoreMediaQuery(query, false);
}

/** Mobile (max-width: 768px) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

/** Tablet (max-width: 992px) */
export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 992px)');
}

/** User prefers dark color scheme */
export function usePrefersColorSchemeDark(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/** User prefers reduced motion for accessibility */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
