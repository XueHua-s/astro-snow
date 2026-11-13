import { useSyncExternalStore } from 'react';

/**
 * Returns `true` once the component has hydrated on the client, `false`
 * during SSR. Use this to guard client-only rendering so server output stays
 * deterministic and avoids hydration mismatches.
 *
 * Implemented with `useSyncExternalStore` so the transition from `false` to
 * `true` is snapshot-consistent and does not require `setState` in an effect.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const isMounted = useIsMounted();
 *   if (!isMounted) return null; // skip server render
 *   return <ClientOnlyWidget />;
 * }
 * ```
 */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
