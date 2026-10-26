import { useStore } from '@nanostores/react';
import { useEventListener, useLatest } from '@reactuses/core';
import { closeSearch, openSearch, searchOpen } from '@store/ui';
import { lockBodyScroll } from '@lib/body-scroll-lock';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchSelection } from './search-dialog/use-search-selection';
import { SearchDialogPanelView } from './search-dialog/panel-view';

const CLOSE_ANIMATION_MS = 200;
const FOCUS_DELAY_MS = 150;

export default function SearchDialogPanel() {
  const isOpen = useStore(searchOpen);
  const [state, setState] = useState<'open' | 'closed'>('closed');
  const [active, setActive] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const frameRef = useRef<number | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusPendingRef = useRef(false);
  const scrollReleaseRef = useRef<(() => void) | null>(null);
  const documentTarget = useCallback(() => document, []);
  const {
    selectedIndex,
    setSelectedIndex,
    clearSelection,
    clearSelectionDom,
    selectResult,
    navigateToSelected,
  } = useSearchSelection();

  const clearSelectionRef = useLatest(clearSelection);
  const clearSelectionDomRef = useLatest(clearSelectionDom);

  const focusSearchInput = useCallback(() => {
    if (!searchOpen.get() || !focusPendingRef.current) return;
    const input = document.querySelector<HTMLInputElement>(
      '#search-dialog-container .pagefind-ui__search-input',
    );
    input?.focus({ preventScroll: true });
    if (input && document.activeElement === input) {
      focusPendingRef.current = false;
    }
  }, []);

  const releaseScrollLock = useCallback(() => {
    scrollReleaseRef.current?.();
    scrollReleaseRef.current = null;
  }, []);

  const setupResultsObserver = useCallback(() => {
    observerRef.current?.disconnect();
    const container = document.getElementById('search-dialog-container');
    if (!container) return;

    const observer = new MutationObserver(() => {
      clearSelectionRef.current();
      // FIXED: Lazy Pagefind initialization may finish after the focus delay.
      focusSearchInput();
    });

    observer.observe(container, { childList: true, subtree: true });
    observerRef.current = observer;
  }, [clearSelectionRef, focusSearchInput]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
        return;
      }
      if (!searchOpen.get()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        return selectResult(selectedIndex + 1);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        return selectResult(selectedIndex - 1);
      }
      if (event.key === 'Enter' && selectedIndex >= 0) {
        event.preventDefault();
        navigateToSelected();
      }
    },
    [navigateToSelected, selectResult, selectedIndex],
  );

  const handleDialogClose = useCallback(() => {
    closeSearch();
  }, []);

  const handleBeforePreparation = useCallback(() => {
    // Navigation owns focus on the destination page, not the closing dialog.
    returnFocusRef.current = null;
    closeSearch();
  }, []);

  const onDialogBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.target === event.currentTarget) {
        closeSearch();
      }
    },
    [],
  );

  const handleBackdropClick = useCallback((event: MouseEvent) => {
    if (
      searchOpen.get() &&
      event.target === document.getElementById('search-dialog')
    ) {
      closeSearch();
    }
  }, []);

  useEffect(() => {
    const cancelPending = () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    if (isOpen) {
      if (!returnFocusRef.current) {
        const focused = document.activeElement;
        const dialog = document.getElementById('search-dialog');
        returnFocusRef.current =
          focused instanceof HTMLElement &&
          focused !== document.body &&
          !dialog?.contains(focused)
            ? focused
            : document.getElementById('search-trigger');
      }
      if (!scrollReleaseRef.current) {
        scrollReleaseRef.current = lockBodyScroll();
      }
      focusPendingRef.current = true;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        if (!searchOpen.get()) return;
        setState('open');
        setActive(true);
      });
      focusTimerRef.current = window.setTimeout(
        focusSearchInput,
        FOCUS_DELAY_MS,
      );
      setupResultsObserver();
      return cancelPending;
    }

    focusPendingRef.current = false;
    clearSelectionDomRef.current();
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!scrollReleaseRef.current) return cancelPending;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setActive(false);
    });
    setSelectedIndex(-1);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (searchOpen.get()) return;
      setState('closed');
      releaseScrollLock();
      // FIXED: The input may already be in the hidden portal. Restore the
      // opener after the shared close lifecycle, for Escape/button/backdrop.
      const opener = returnFocusRef.current;
      returnFocusRef.current = null;
      const target = opener?.isConnected
        ? opener
        : opener
          ? document.getElementById('search-trigger')
          : null;
      target?.focus({ preventScroll: true });
    }, CLOSE_ANIMATION_MS);
    return cancelPending;
  }, [
    clearSelectionDomRef,
    focusSearchInput,
    isOpen,
    releaseScrollLock,
    setSelectedIndex,
    setupResultsObserver,
  ]);

  useEventListener('keydown', handleKeyDown, documentTarget);
  useEventListener('click', handleBackdropClick, documentTarget);
  useEventListener(
    'astro:before-preparation',
    handleBeforePreparation,
    documentTarget,
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      returnFocusRef.current = null;
      releaseScrollLock();
    };
  }, [releaseScrollLock]);

  const overlayClassName = useMemo(
    () =>
      `fixed inset-0 z-40 bg-black/50 glass-scrim transition-opacity duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
      } ${state === 'closed' ? 'hidden' : ''}`,
    [active, state],
  );

  const dialogClassName = useMemo(
    () =>
      `fixed inset-0 z-50 grid place-items-center px-4 ${
        state === 'closed' ? 'hidden' : ''
      }`,
    [state],
  );

  const contentClassName = useMemo(
    () =>
      `glass glass-overlay w-full max-w-3xl overflow-auto transition-[opacity,transform] duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
      }`,
    [active],
  );

  return (
    <SearchDialogPanelView
      state={state}
      isOpen={isOpen}
      overlayClassName={overlayClassName}
      dialogClassName={dialogClassName}
      contentClassName={contentClassName}
      onDialogBackgroundClick={onDialogBackgroundClick}
      onDialogClose={handleDialogClose}
    />
  );
}
