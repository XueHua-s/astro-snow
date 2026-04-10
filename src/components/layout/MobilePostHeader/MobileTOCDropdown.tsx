/**
 * MobileTOCDropdown Component
 *
 * Dropdown panel for the mobile table of contents.
 * Uses Floating UI for positioning and Motion for animations.
 */

import {
  FloatingFocusManager,
  FloatingPortal,
  useClick,
  useDismiss,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type ReactElement } from 'react';
import { animation } from '@constants/design-tokens';
import { HeadingList } from '../TableOfContents/HeadingList';
import type { Heading } from '@hooks/useHeadingTree';
import { cn } from '@/lib/utils';

interface MobileTOCDropdownProps {
  /** Hierarchical heading tree */
  headings: Heading[];
  /** ID of the currently active heading */
  activeId: string;
  /** Set of expanded heading IDs */
  expandedIds: Set<string>;
  /** Callback when a heading is clicked */
  onHeadingClick: (id: string) => void;
  /** Trigger element that opens the dropdown */
  trigger: ReactElement;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Whether to enable CSS counter numbering (default: true) */
  enableNumbering?: boolean;
}

export function MobileTOCDropdown({
  headings,
  activeId,
  expandedIds,
  onHeadingClick,
  trigger,
  open: passedOpen,
  onOpenChange,
  enableNumbering = true,
}: MobileTOCDropdownProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });

  const { refs, floatingStyles, context } = useFloatingUI({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    offset: 10,
    transform: false,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { ancestorScroll: true });
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);
  const referenceRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (referenceRef.current) {
      refs.setReference(referenceRef.current);
    }
  }, [refs]);

  useEffect(() => {
    if (isOpen && floatingRef.current) {
      refs.setFloating(floatingRef.current);
    }
  }, [isOpen, refs]);

  const handleHeadingClick = (id: string) => {
    onHeadingClick(id);
    setIsOpen(false);
  };

  const { className: referenceClassName, ...referenceProps } =
    getReferenceProps();
  const floatingProps = getFloatingProps();

  return (
    <>
      <span
        ref={referenceRef}
        className={cn(
          'inline-flex',
          typeof referenceClassName === 'string'
            ? referenceClassName
            : undefined,
        )}
        {...referenceProps}>
        {trigger}
      </span>
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <motion.div
                ref={floatingRef}
                style={{
                  ...floatingStyles,
                  left: '50%',
                  marginLeft: '-9rem',
                }}
                className="bg-background/80 border-border z-[90] max-h-[60vh] w-72 overflow-auto rounded-2xl border p-3 backdrop-blur-md"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, originY: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={animation.spring.popoverContent}
                {...floatingProps}>
                <nav
                  className={enableNumbering ? '' : 'toc-no-numbering'}
                  aria-label="文章目录">
                  <div className="space-y-1">
                    <HeadingList
                      headings={headings}
                      depth={0}
                      activeId={activeId}
                      expandedIds={expandedIds}
                      onHeadingClick={handleHeadingClick}
                    />
                  </div>
                </nav>
              </motion.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}
