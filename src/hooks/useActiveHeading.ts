/**
 * useActiveHeading Hook
 *
 * Tracks the currently active heading based on scroll position.
 * Uses Intersection Observer to avoid forced reflows.
 * Uses useSyncExternalStore to avoid unnecessary re-renders.
 *
 * @example
 * ```tsx
 * function TableOfContents() {
 *   const activeId = useActiveHeading({ offsetTop: 120 });
 *
 *   return (
 *     <nav>
 *       {headings.map(heading => (
 *         <a
 *           key={heading.id}
 *           className={activeId === heading.id ? 'active' : ''}
 *         >
 *           {heading.text}
 *         </a>
 *       ))}
 *     </nav>
 *   );
 * }
 * ```
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  getViewportHeadingStore,
  subscribeToNoHeadings,
} from './heading-viewport-store';

export interface UseActiveHeadingOptions {
  /** Offset from the top of the viewport, in pixels. */
  offsetTop?: number;
  enabled?: boolean;
}

const emptyActiveId = () => '';

export function useActiveHeading({
  offsetTop = 120,
  enabled = true,
}: UseActiveHeadingOptions = {}): string {
  const store = getViewportHeadingStore(offsetTop, 'toc');
  const getActiveId = useCallback(() => store.getSnapshot()?.id ?? '', [store]);
  return useSyncExternalStore(
    enabled ? store.subscribe : subscribeToNoHeadings,
    enabled ? getActiveId : emptyActiveId,
    emptyActiveId,
  );
}
