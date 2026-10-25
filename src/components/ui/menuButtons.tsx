/**
 * MenuIcon Component (Refactored)
 *
 * Hamburger menu icon with animated state transitions.
 *
 * Key improvements:
 * - Uses Nanostores instead of CustomEvent for state management
 * - Uses design tokens instead of hardcoded colors
 * - Cleaner and more maintainable code
 */

'use client';

import type { Ref } from 'react';
import type { Variants } from 'motion/react';
import { motion } from 'motion/react';
import { useStore } from '@nanostores/react';
import { cn } from '@lib/utils';
import { closeDrawer, drawerOpen, openDrawer } from '@store/ui';
import { animation } from '@constants/design-tokens';

const iconVariants: Variants = {
  closed: {
    rotate: 0,
    opacity: 1,
    transition: animation.spring.menu,
  },
  opened: {
    rotate: 90,
    opacity: 1,
    transition: animation.spring.menu,
  },
};

interface MenuButtonProps {
  className?: string;
  id?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}

const OpenMenuButton = ({ className, id, buttonRef }: MenuButtonProps) => {
  const isOpen = useStore(drawerOpen);

  const handleOpen = () => {
    openDrawer();
  };

  return (
    <div
      className={cn(className)}
      id={id}
      style={{ viewTransitionName: 'home-menu-icon' }}>
      <button
        className={cn(
          'glass glass-control flex-center text-shoka size-10 cursor-pointer rounded-full select-none',
          isOpen && 'hidden',
        )}
        onClick={handleOpen}
        aria-label="打开菜单"
        aria-expanded={isOpen}
        type="button"
        ref={buttonRef}
        style={{
          viewTransitionName: 'menu-icon',
        }}>
        <motion.i
          className={cn('text-xl', 'fa-solid fa-bars')}
          variants={iconVariants}
          initial={false}
          animate="closed"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

const CloseMenuButton = ({ className, id, buttonRef }: MenuButtonProps) => {
  const isOpen = useStore(drawerOpen);

  const handleClose = () => {
    closeDrawer();
  };

  return (
    <div className={cn(className)} id={id}>
      <button
        className={cn(
          'glass glass-flat flex-center text-shoka size-10 cursor-pointer rounded-full select-none',
          !isOpen && 'hidden',
        )}
        onClick={handleClose}
        aria-label="关闭菜单"
        aria-expanded={isOpen}
        type="button"
        ref={buttonRef}>
        <motion.i
          className={cn('text-xl', 'fa-solid fa-xmark')}
          variants={iconVariants}
          initial={false}
          animate="opened"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

export { OpenMenuButton, CloseMenuButton };
