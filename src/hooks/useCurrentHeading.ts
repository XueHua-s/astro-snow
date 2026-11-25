import { useMemo, useSyncExternalStore } from 'react';
import {
  getViewportHeadingStore,
  subscribeToNoHeadings,
} from './heading-viewport-store';

export interface CurrentHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface UseCurrentHeadingOptions {
  offsetTop?: number;
  enabled?: boolean;
}

const emptyCurrentHeading = () => null;

export function useCurrentHeading({
  offsetTop = 80,
  enabled = true,
}: UseCurrentHeadingOptions = {}): CurrentHeading | null {
  const store = getViewportHeadingStore(offsetTop, 'current');
  const heading = useSyncExternalStore(
    enabled ? store.subscribe : subscribeToNoHeadings,
    enabled ? store.getSnapshot : emptyCurrentHeading,
    emptyCurrentHeading,
  );

  return useMemo(() => {
    if (!heading || (heading.level !== 2 && heading.level !== 3)) return null;
    const { id, text, level } = heading;
    return { id, text, level };
  }, [heading]);
}
