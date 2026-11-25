/**
 * MobilePostHeader Component
 *
 * Mobile-only header for post pages that shows current heading title
 * with progress circle and expandable TOC dropdown.
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { animation } from '@constants/design-tokens';
import {
  useHeadingTree,
  useActiveHeading,
  useExpandedState,
  useHeadingClickHandler,
} from '@hooks/index';
import { useIsTablet } from '@hooks/useMediaQuery';
import { useCurrentHeading } from '@hooks/useCurrentHeading';
import { HeadingTitle } from './HeadingTitle';
import { ProgressCircle } from './ProgressCircle';
import { MobileTOCDropdown } from './MobileTOCDropdown';
import { blogLayoutConfig } from '@/config/blogLayoutConfig';
import { Routes } from '@/constants/router';
import type { MarkdownHeading } from '@/types/markdown';
import { OpenMenuButton } from '@components/ui/menuButtons.tsx';
import { cn } from '@lib/utils.ts';

interface MobilePostHeaderProps {
  /** Whether the current page is a post page */
  isPostPage: boolean;
  hasMobileDrawer: boolean;
  /** Type of logo element to display */
  logoElement: 'svg' | 'text';
  /** Text to display when logoElement is 'text' */
  logoText?: string;
  /** Logo image URL (for svg type) */
  logoSrc?: string;
  /** Whether to enable CSS counter numbering in TOC (default: true) */
  enableNumbering?: boolean;
  /** Precomputed headings from content metadata (optional) */
  sourceHeadings?: MarkdownHeading[];
}

// Scroll offset for detecting active heading
const SCROLL_OFFSET_TOP = 80;

interface LogoProps {
  logoElement: 'svg' | 'text';
  logoText?: string;
  logoSrc?: string;
  className?: string;
}

function Logo({ logoElement, logoText, logoSrc, className }: LogoProps) {
  return (
    <a href={Routes.Home} className="flex items-center gap-1">
      {logoElement === 'svg' && logoSrc ? (
        <img
          src={logoSrc}
          alt={blogLayoutConfig?.alternate ?? blogLayoutConfig?.name}
          className={cn('h-8', className)}
          height={32}
        />
      ) : (
        <span className={cn('logo-text text-primary', className)}>
          {logoText}
        </span>
      )}
    </a>
  );
}

export function MobilePostHeader({
  isPostPage,
  hasMobileDrawer,
  logoElement,
  logoText,
  logoSrc,
  enableNumbering = true,
  sourceHeadings,
}: MobilePostHeaderProps) {
  const shouldReduceMotion = useReducedMotion();

  const isMobile = useIsTablet();
  const observeHeadings = isPostPage && isMobile;

  // Get current H2/H3 heading for title display
  const currentHeading = useCurrentHeading({
    offsetTop: SCROLL_OFFSET_TOP,
    enabled: observeHeadings,
  });

  // Get full heading tree for TOC dropdown
  const headings = useHeadingTree(
    observeHeadings ? sourceHeadings : undefined,
    observeHeadings,
  );

  // Get active heading ID for TOC highlighting
  const activeId = useActiveHeading({
    offsetTop: SCROLL_OFFSET_TOP + 40,
    enabled: observeHeadings,
  });

  // Get expanded state for TOC accordion
  const { expandedIds, setExpandedIds } = useExpandedState({
    headings,
    activeId,
    defaultExpanded: false,
  });

  // Determine if we should show heading mode
  const showHeadingMode = headings.length > 0 && currentHeading !== null;

  // Handle heading click in TOC dropdown
  const handleHeadingClick = useHeadingClickHandler({
    headings,
    setExpandedIds,
  });

  // If not mobile or not a post page, always show logo
  if (!isMobile) {
    return (
      <Logo logoElement={logoElement} logoText={logoText} logoSrc={logoSrc} />
    );
  }

  return (
    <div className="flex w-full h-full items-center gap-2">
      {/*Mobile Menu controller*/}
      {hasMobileDrawer && (
        <OpenMenuButton
          className="tablet:flex tablet:items-center tablet:justify-center z-[70] hidden h-14 transition-transform"
          id="mobile-menu-container"
        />
      )}
      <AnimatePresence mode="wait">
        {/*directoryOfArticleTitles / logo*/}
        {showHeadingMode ? (
          // H-Title anchorList
          <motion.div
            key="heading-mode"
            className="flex-1 relative flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              shouldReduceMotion ? { duration: 0 } : animation.spring.gentle
            }>
            <MobileTOCDropdown
              headings={headings}
              activeId={activeId}
              expandedIds={expandedIds}
              onHeadingClick={handleHeadingClick}
              enableNumbering={enableNumbering}
              trigger={
                <button
                  className="glass glass-control header-surface absolute left-0 top-[50%] flex w-[calc(100%-16px)] translate-y-[-50%] items-center gap-2.5 rounded-full py-1 pl-1.5 pr-3 text-foreground transition-colors"
                  aria-label="展开目录">
                  {/* Progress circle - fixed size container */}
                  <div className="relative shrink-0">
                    <ProgressCircle size={32} strokeWidth={2.5} />
                  </div>
                  <div className="overflow-hidden">
                    <HeadingTitle heading={currentHeading} />
                  </div>
                </button>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="logo-mode"
            className={
              'absolute w-fit translate-x-[-50%] translate-y-[-50%] left-[50%] top-[50%] z-70'
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              shouldReduceMotion ? { duration: 0 } : animation.spring.gentle
            }>
            <div>
              <Logo
                logoElement={logoElement}
                logoText={logoText}
                logoSrc={logoSrc}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
