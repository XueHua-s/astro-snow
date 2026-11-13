import { useCallback, useState } from 'react';
import { useEventListener } from '@reactuses/core';
import { normalizeRoutePath } from '@constants/router';

const getBrowserPathname = () => {
  if (typeof window === 'undefined') return '';
  return normalizeRoutePath(window.location.pathname);
};

export function useCurrentPathname(initialPath?: string) {
  const normalizedInitialPath = normalizeRoutePath(initialPath);
  const [pathname, setPathname] = useState(
    () => getBrowserPathname() || normalizedInitialPath || '/',
  );

  const syncPathname = useCallback(() => {
    // Re-use the already-normalised initial path instead of re-computing it.
    const nextPathname = getBrowserPathname() || normalizedInitialPath || '/';
    setPathname((currentPathname) =>
      currentPathname === nextPathname ? currentPathname : nextPathname,
    );
  }, [normalizedInitialPath]);

  const documentTarget = useCallback(
    () => (typeof document === 'undefined' ? null : document),
    [],
  );
  const windowTarget = useCallback(
    () => (typeof window === 'undefined' ? null : window),
    [],
  );

  // FIXED: Keep hydrated sidebar route state aligned with Astro client navigation.
  useEventListener('astro:page-load', syncPathname, documentTarget);
  useEventListener('astro:after-swap', syncPathname, documentTarget);
  useEventListener('popstate', syncPathname, windowTarget);

  return pathname;
}
