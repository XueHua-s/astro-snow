import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { FloatingFocusManager, useFloating } from '@floating-ui/react';
import { closeDrawer, drawerOpen } from '@store/ui';
import { cn } from '@lib/utils';
import { lockBodyScroll } from '@lib/body-scroll-lock';
import { CloseMenuButton } from '@components/ui/menuButtons.tsx';
import { TABLET_MEDIA_QUERY, useIsTablet } from '@hooks/useMediaQuery';

interface MobileDrawerPanelProps {
  children: ReactNode;
}

export function MobileDrawerPanel({ children }: MobileDrawerPanelProps) {
  const drawerRequested = useStore(drawerOpen);
  const isTablet = useIsTablet();
  const isOpen = drawerRequested && isTablet;
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { refs, context } = useFloating({ open: isOpen });
  const setDrawer = useCallback(
    (element: HTMLDivElement | null) => refs.setFloating(element),
    [refs],
  );

  useEffect(() => {
    const tablet = window.matchMedia(TABLET_MEDIA_QUERY);
    const closeOnDesktop = () => {
      if (!tablet.matches) closeDrawer();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && tablet.matches && drawerOpen.get()) {
        event.preventDefault();
        closeDrawer();
      }
    };

    const handleBeforePreparation = () => {
      openerRef.current = null;
      closeDrawer();
    };

    closeOnDesktop();
    tablet.addEventListener('change', closeOnDesktop);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener(
      'astro:before-preparation',
      handleBeforePreparation,
    );

    return () => {
      tablet.removeEventListener('change', closeOnDesktop);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener(
        'astro:before-preparation',
        handleBeforePreparation,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.querySelector<HTMLButtonElement>(
      '#mobile-drawer-trigger',
    );
    const release = lockBodyScroll();
    // Wait for the open styles and the close button to commit before focusing.
    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      release();
    };
  }, [isOpen]);

  return (
    <>
      <div
        id="drawer-overlay"
        ref={overlayRef}
        className={cn(
          'glass-scrim fixed inset-0 z-[60] hidden bg-black/50',
          isOpen && 'tablet:block',
        )}
        role="presentation"
        aria-hidden={!isOpen}
        onClick={closeDrawer}
      />

      <FloatingFocusManager
        context={context}
        disabled={!isOpen}
        initialFocus={-1}
        returnFocus={openerRef}
        getInsideElements={() =>
          overlayRef.current ? [overlayRef.current] : []
        }
        outsideElementsInert>
        <div
          ref={setDrawer}
          id="mobile-drawer"
          className={cn(
            'glass glass-overlay tablet:flex fixed inset-y-0 left-0 z-[70] hidden h-screen w-[70vw] min-w-64 transform rounded-l-none border-l-0 px-4 pt-6 duration-300 md:px-0',
            isOpen
              ? 'translate-x-0 transition-transform'
              : 'invisible -translate-x-full transition-[transform,visibility]',
          )}
          role="dialog"
          aria-label="导航菜单"
          aria-hidden={!isOpen}
          aria-modal={isOpen || undefined}
          inert={!isOpen}>
          <div className="flex h-full w-full flex-col overflow-auto">
            <div className="flex justify-end pb-2 pr-4">
              <CloseMenuButton
                className="flex"
                id="close-drawer"
                buttonRef={closeButtonRef}
                isOpen={isOpen}
              />
            </div>
            {children}
          </div>
        </div>
      </FloatingFocusManager>
    </>
  );
}

export default MobileDrawerPanel;
