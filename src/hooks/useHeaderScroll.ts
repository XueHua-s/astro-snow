import { useCallback, useEffect, useRef } from 'react';
import { useEventListener, useThrottleFn } from '@reactuses/core';
import { Routes } from '@constants/router';

const DESKTOP_BREAKPOINT = 992;

function setHeaderVisible(header: HTMLElement | null, visible: boolean) {
  if (header)
    header.style.transform = visible ? 'translateY(0)' : 'translateY(-100%)';
}

const useHeaderScroll = () => {
  const firstScrollRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const isHeaderPinnedRef = useRef(false);
  const isActiveRef = useRef(false);
  const siteHeaderRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLElement | null>(null);

  const handleScroll = useCallback(() => {
    if (!isActiveRef.current) return;
    const siteHeader = siteHeaderRef.current;
    const mobileMenuContainer = mobileMenuRef.current;
    const currentScrollY = window.scrollY;
    const isDesktop = window.innerWidth > DESKTOP_BREAKPOINT;
    const height = window.innerHeight;

    if (siteHeader && !isDesktop) {
      siteHeader.classList.toggle(
        'with-background',
        currentScrollY > height * 0.45,
      );
    }

    if (!isDesktop && firstScrollRef.current) {
      firstScrollRef.current = false;
      lastScrollYRef.current = currentScrollY;
      return;
    }

    if (!isDesktop && window.location.pathname.startsWith(`${Routes.Post}/`)) {
      setHeaderVisible(siteHeader, true);
      mobileMenuContainer?.classList.remove('-translate-y-full');
      lastScrollYRef.current = currentScrollY;
      return;
    }

    // FIXED: Returning all the way to zero must reveal the reference too;
    // otherwise keyboard/hover navigation remains translated out of view.
    if (currentScrollY <= 0) {
      setHeaderVisible(siteHeader, true);
      siteHeader?.classList.remove('with-background');
      isHeaderPinnedRef.current = false;
      mobileMenuContainer?.classList.remove('-translate-y-full');
    } else if (isDesktop) {
      const inCover = currentScrollY <= height * 0.4;
      // Once revealed, the toolbar stays pinned on the way up until it reaches the cover.
      const pinned =
        !inCover &&
        currentScrollY < lastScrollYRef.current &&
        (isHeaderPinnedRef.current || currentScrollY > height * 0.5);
      isHeaderPinnedRef.current = pinned;
      setHeaderVisible(siteHeader, inCover || pinned);
      siteHeader?.classList.toggle('with-background', pinned);
    } else {
      const scrollingDown = currentScrollY > lastScrollYRef.current;
      setHeaderVisible(siteHeader, !scrollingDown);
      mobileMenuContainer?.classList.toggle('-translate-y-full', scrollingDown);
    }
    lastScrollYRef.current = currentScrollY;
  }, []);

  const { run: onScroll, cancel: cancelScroll } = useThrottleFn(
    handleScroll,
    80,
  ) as {
    run: () => void;
    cancel: () => void;
  };
  const documentTarget = useCallback(() => document, []);

  const initNavigator = useCallback(() => {
    cancelScroll();
    firstScrollRef.current = true;
    isHeaderPinnedRef.current = false;
    lastScrollYRef.current = window.scrollY;

    // Cache DOM elements for scroll handler
    siteHeaderRef.current = document.getElementById('site-header');
    mobileMenuRef.current = document.getElementById('mobile-menu-container');

    isActiveRef.current = true;
    onScroll();
  }, [cancelScroll, onScroll]);

  const cleanupNavigator = useCallback(() => {
    isActiveRef.current = false;
    siteHeaderRef.current = null;
    mobileMenuRef.current = null;
    cancelScroll();
  }, [cancelScroll]);

  const scrollTarget = useCallback(
    () => (typeof window === 'undefined' ? null : window),
    [],
  );

  useEventListener('scroll', onScroll, scrollTarget, { passive: true });
  useEventListener('astro:page-load', initNavigator, documentTarget);
  useEventListener('astro:before-swap', cleanupNavigator, documentTarget);

  useEffect(() => {
    if (document.readyState !== 'loading') {
      initNavigator();
    }

    return () => {
      cleanupNavigator();
    };
  }, [cleanupNavigator, initNavigator]);
};
export { useHeaderScroll };
