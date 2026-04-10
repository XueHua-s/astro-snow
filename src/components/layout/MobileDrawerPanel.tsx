import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { closeDrawer, drawerOpen } from '@store/ui';
import { cn } from '@lib/utils';
import { lockBodyScroll, unlockBodyScroll } from '@lib/body-scroll-lock';
import { CloseMenuButton } from '@components/ui/menuButtons.tsx';

interface MobileDrawerPanelProps {
  children: ReactNode;
}

export function MobileDrawerPanel({ children }: MobileDrawerPanelProps) {
  const isOpen = useStore(drawerOpen);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drawerOpen.get()) {
        closeDrawer();
      }
    };

    const handleBeforePreparation = () => {
      closeDrawer();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener(
      'astro:before-preparation',
      handleBeforePreparation,
    );

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener(
        'astro:before-preparation',
        handleBeforePreparation,
      );
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      <div
        id="drawer-overlay"
        className={cn('fixed inset-0 z-[60] bg-black/50', !isOpen && 'hidden')}
        role="presentation"
        aria-hidden={!isOpen}
        onClick={closeDrawer}
      />

      <div
        id="mobile-drawer"
        className={cn(
          'bg-gradient-start tablet:flex fixed inset-y-0 left-0 z-[70] hidden h-screen w-[70vw] min-w-64 transform px-4 pt-6 shadow-lg backdrop-blur-sm transition-transform duration-300 md:px-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-label="导航菜单"
        aria-modal="true">
        <div className="flex h-full w-full flex-col overflow-auto">
          <div className="flex justify-end pb-2 pr-4">
            <CloseMenuButton
              className="flex"
              id="close-drawer"
              buttonRef={closeButtonRef}
            />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export default MobileDrawerPanel;
