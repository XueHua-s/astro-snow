import { useStore } from '@nanostores/react';
import { useEventListener } from '@reactuses/core';
import { closeSearch, openSearch, searchOpen } from '@store/ui';
import { lockBodyScroll, unlockBodyScroll } from '@lib/body-scroll-lock';
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
  const documentTarget = useCallback(() => document, []);
  const {
    selectedIndex,
    setSelectedIndex,
    clearSelection,
    clearSelectionDom,
    selectResult,
    navigateToSelected,
  } = useSearchSelection();

  const setupResultsObserver = useCallback(() => {
    observerRef.current?.disconnect();
    const container = document.getElementById('search-dialog-container');
    if (!container) return;

    const observer = new MutationObserver(() => {
      clearSelection();
    });

    observer.observe(container, { childList: true, subtree: true });
    observerRef.current = observer;
  }, [clearSelection]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
        return;
      }
      if (!searchOpen.get()) return;
      if (event.key === 'Escape') return closeSearch();
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

  const onDialogBackgroundClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.target === event.currentTarget) {
        closeSearch();
      }
    },
    [],
  );

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    if (isOpen) {
      lockBodyScroll();
      requestAnimationFrame(() => {
        setState('open');
        setActive(true);
      });

      focusTimerRef.current = window.setTimeout(() => {
        const searchInput = document.querySelector<HTMLInputElement>(
          '.pagefind-ui__search-input',
        );
        searchInput?.focus();
      }, FOCUS_DELAY_MS);

      setupResultsObserver();
      return;
    }

    clearSelectionDom();
    observerRef.current?.disconnect();
    observerRef.current = null;
    requestAnimationFrame(() => {
      setActive(false);
    });
    queueMicrotask(() => {
      setSelectedIndex(-1);
    });

    closeTimerRef.current = window.setTimeout(() => {
      setState('closed');
      unlockBodyScroll();
    }, CLOSE_ANIMATION_MS);
  }, [clearSelectionDom, isOpen, setSelectedIndex, setupResultsObserver]);

  useEventListener('keydown', handleKeyDown, documentTarget);
  useEventListener(
    'astro:before-preparation',
    handleDialogClose,
    documentTarget,
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
      observerRef.current?.disconnect();
      unlockBodyScroll();
    };
  }, []);

  const overlayClassName = useMemo(
    () =>
      `fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
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
      `bg-gradient-start shadow-box w-full max-w-3xl overflow-auto rounded-xl transition-all duration-200 ${
        active ? 'opacity-100' : 'opacity-0'
      }`,
    [active],
  );

  return (
    <SearchDialogPanelView
      state={state}
      overlayClassName={overlayClassName}
      dialogClassName={dialogClassName}
      contentClassName={contentClassName}
      onDialogBackgroundClick={onDialogBackgroundClick}
      onDialogClose={handleDialogClose}
    />
  );
}
