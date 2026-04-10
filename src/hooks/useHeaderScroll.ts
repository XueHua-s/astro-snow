import { useCallback, useEffect, useRef } from 'react';
import { useEventListener, useThrottleFn, useTimeoutFn } from '@reactuses/core';
import { Routes } from '@constants/router';

const DESKTOP_BREAKPOINT = 992;
const SCROLL_END_DELAY = 800;

type ScrollDistances = {
  hide: number;
  show: number;
  background: number;
};

const useHeaderScroll = () => {
  const firstScrollRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const isHeaderPinnedRef = useRef(false);
  const distancesRef = useRef<ScrollDistances>({
    hide: 0,
    show: 0,
    background: 0,
  });
  const isActiveRef = useRef(false);
  const siteHeaderRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLElement | null>(null);

  const updateDistances = useCallback(() => {
    const height = window.innerHeight;
    distancesRef.current = {
      hide: height * 0.4,
      show: height * 0.5,
      background: height * 0.45,
    };
  }, []);

  const isPostPageMobile = useCallback(() => {
    const isMobile = window.innerWidth <= DESKTOP_BREAKPOINT;
    const isPostPage = window.location.pathname.startsWith(`${Routes.Post}/`);
    return isMobile && isPostPage;
  }, []);

  const setHeaderVisible = useCallback(
    (siteHeader: HTMLElement | null, visible: boolean) => {
      if (!siteHeader) return;
      siteHeader.style.transform = visible
        ? 'translateY(0)'
        : 'translateY(-100%)';
    },
    [],
  );

  const [, startScrollEndTimer, stopScrollEndTimer] = useTimeoutFn(
    () => {
      // Intentionally empty to keep behavior aligned with previous scroll-end timer.
    },
    SCROLL_END_DELAY,
    { immediate: false },
  );

  const handleScroll = useCallback(() => {
    if (!isActiveRef.current) return;
    const siteHeader = siteHeaderRef.current;
    const mobileMenuContainer = mobileMenuRef.current;
    const currentScrollY = window.scrollY;
    const isDesktop = window.innerWidth > DESKTOP_BREAKPOINT;
    const { hide, show, background } = distancesRef.current;

    if (siteHeader && !isDesktop) {
      if (currentScrollY > background) {
        siteHeader.classList.add('with-background');
      } else {
        siteHeader.classList.remove('with-background');
      }
    }

    if (!isDesktop && firstScrollRef.current) {
      firstScrollRef.current = false;
      lastScrollYRef.current = currentScrollY;
      return;
    }

    if (isPostPageMobile()) {
      stopScrollEndTimer();
      setHeaderVisible(siteHeader, true);
      mobileMenuContainer?.classList.remove('-translate-y-full');
      startScrollEndTimer();
      lastScrollYRef.current = currentScrollY;
      return;
    }

    if (currentScrollY > 0) {
      if (isDesktop) {
        const isScrollingUp = currentScrollY < lastScrollYRef.current;
        if (currentScrollY <= hide) {
          setHeaderVisible(siteHeader, true);
          siteHeader?.classList.remove('with-background');
          isHeaderPinnedRef.current = false;
        } else if (isHeaderPinnedRef.current && isScrollingUp) {
          setHeaderVisible(siteHeader, true);
          siteHeader?.classList.add('with-background');
        } else if (currentScrollY > show && isScrollingUp) {
          setHeaderVisible(siteHeader, true);
          siteHeader?.classList.add('with-background');
          isHeaderPinnedRef.current = true;
        } else {
          setHeaderVisible(siteHeader, false);
          siteHeader?.classList.remove('with-background');
          isHeaderPinnedRef.current = false;
        }
      } else {
        if (currentScrollY > lastScrollYRef.current) {
          setHeaderVisible(siteHeader, false);
          mobileMenuContainer?.classList.add('-translate-y-full');
        } else {
          setHeaderVisible(siteHeader, true);
          mobileMenuContainer?.classList.remove('-translate-y-full');
        }
      }
    }
    lastScrollYRef.current = currentScrollY;
  }, [
    isPostPageMobile,
    setHeaderVisible,
    startScrollEndTimer,
    stopScrollEndTimer,
  ]);

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
    stopScrollEndTimer();
    firstScrollRef.current = true;
    isHeaderPinnedRef.current = false;
    updateDistances();
    lastScrollYRef.current = window.scrollY;

    // Cache DOM elements for scroll handler
    siteHeaderRef.current = document.getElementById('site-header');
    mobileMenuRef.current = document.getElementById('mobile-menu-container');

    if (siteHeaderRef.current) {
      siteHeaderRef.current.style.transition = 'transform 0.3s ease';
      siteHeaderRef.current.style.willChange = 'transform';
    }

    isActiveRef.current = true;
    onScroll();
  }, [cancelScroll, onScroll, stopScrollEndTimer, updateDistances]);

  const cleanupNavigator = useCallback(() => {
    isActiveRef.current = false;
    siteHeaderRef.current = null;
    mobileMenuRef.current = null;
    cancelScroll();
    stopScrollEndTimer();
  }, [cancelScroll, stopScrollEndTimer]);

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
