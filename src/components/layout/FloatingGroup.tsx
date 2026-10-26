import { useStore } from '@nanostores/react';
import { drawerOpen, searchOpen } from '@store/ui';
import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';

const subscribeToHydration = () => () => {};

export default function FloatingGroup() {
  const isDrawerOpen = useStore(drawerOpen);
  const isSearchOpen = useStore(searchOpen);
  const [isExpanded, setIsExpanded] = useState(true);
  // FIXED: Live stores may change before this idle island loads. React's server
  // snapshot matches SSR first, then its client snapshot applies live state.
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const isHidden = hasHydrated && (isDrawerOpen || isSearchOpen);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0, // FIXED: Explicit smooth scrolling must respect reduced motion too.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      // FIXED: Explicit smooth scrolling must respect reduced motion too.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, []);

  const floatingStyle = useMemo<CSSProperties>(
    () =>
      isHidden
        ? { transform: 'translateX(200%)', opacity: 0, pointerEvents: 'none' }
        : {},
    [isHidden],
  );

  return (
    <div
      id="floating-nav"
      className="text-primary fixed right-4 bottom-4 z-50"
      data-expanded={String(isExpanded)}
      data-hydrated={String(hasHydrated)}
      aria-hidden={isHidden || undefined}
      inert={isHidden}
      style={floatingStyle}>
      <div className="glass glass-control flex flex-col gap-1 rounded-full p-1">
        <div
          id="nav-content"
          // FIXED: Collapsed controls must leave both pointer and keyboard navigation.
          inert={!isExpanded}
          aria-hidden={!isExpanded || undefined}
          className="flex scale-y-100 flex-col gap-1 opacity-100">
          <button
            id="scroll-to-top"
            className="flex-center rounded-full p-2 transition-colors hover:bg-foreground/10"
            aria-label="回到顶部"
            title="回到顶部"
            suppressHydrationWarning
            data-tooltip-interactive="false"
            data-tooltip-placement="left"
            onClick={scrollToTop}>
            <i className="fa-solid fa-angle-up text-lg" aria-hidden="true" />
          </button>
          <button
            id="scroll-to-bottom"
            className="flex-center rounded-full p-2 transition-colors hover:bg-foreground/10"
            aria-label="滚到底部"
            title="滚到底部"
            suppressHydrationWarning
            data-tooltip-interactive="false"
            data-tooltip-placement="left"
            onClick={scrollToBottom}>
            <i className="fa-solid fa-angle-down text-lg" aria-hidden="true" />
          </button>
        </div>

        <button
          id="toggle-nav"
          className="flex-center size-9 rounded-full transition-colors hover:bg-foreground/10"
          aria-label="展开/收起工具栏"
          title="展开/收起工具栏"
          suppressHydrationWarning
          aria-expanded={isExpanded}
          data-tooltip-interactive="false"
          data-tooltip-placement="left"
          onClick={handleToggle}>
          <i
            className={`fa-solid fa-wand-magic-sparkles menu-nav-icon text-sm transition-transform duration-300 ${
              isExpanded ? 'hidden' : ''
            }`}
            aria-hidden="true"
          />
          <i
            className={`fa-solid fa-xmark close-nav-icon text-sm transition-transform duration-300 ${
              isExpanded ? '' : 'hidden'
            }`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
