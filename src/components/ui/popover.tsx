import {
  FloatingFocusManager,
  FloatingPortal,
  useClick,
  useDismiss,
  useHover,
  useInteractions,
  useRole,
  type Placement,
} from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
import { cn } from '@lib/utils';
import {
  AnimatePresence,
  motion,
  type MotionProps,
  useReducedMotion,
} from 'motion/react';
import React, { cloneElement, useCallback } from 'react';
import { animation } from '@constants/design-tokens';
import { withFloatingErrorBoundary } from '@components/common/FloatingErrorBoundary';

type PopoverProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  render: (data: { close: () => void }) => React.ReactNode;
  placement?: Placement;
  children: React.JSX.Element;
  className?: string;
  offset?: number;
  motionProps?: MotionProps;
  trigger?: 'click' | 'hover';
};

function Popover({
  children,
  render,
  open: passedOpen,
  placement,
  onOpenChange,
  className,
  offset: offsetNum = 10,
  motionProps,
  trigger = 'click',
}: React.PropsWithChildren<PopoverProps>) {
  const shouldReduceMotion = useReducedMotion();

  // Use useControlledState for open/close state management
  const [isOpen, setIsOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });

  // Use useFloatingUI for positioning logic
  const { refs, floatingStyles, context } = useFloatingUI({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    offset: offsetNum,
    transform: false,
  });

  // Configure interaction hooks based on trigger type
  const hover = useHover(context, {
    enabled: trigger === 'hover',
    delay: { open: 0, close: animation.duration.fast },
  });
  const click = useClick(context, {
    // FIXED: Hover menus still need native Enter/Space and touch activation.
    ignoreMouse: trigger === 'hover',
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    useDismiss(context, { ancestorScroll: true }),
    useRole(context),
  ]);

  const referenceProps = getReferenceProps();
  const floatingProps = getFloatingProps();

  const setReference = useCallback(
    (node: HTMLElement | null) => {
      refs.setReference(node);
    },
    [refs],
  );

  const setFloating = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
    },
    [refs],
  );
  return (
    <>
      {cloneElement(children, { ...referenceProps, ref: setReference })}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager
              context={context}
              modal={false}
              initialFocus={trigger === 'hover' ? -1 : 0}>
              <motion.div
                className={cn('glass glass-control z-10', className)}
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                animate={{ opacity: 1, scale: 1, originY: 0 }}
                exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : animation.spring.popoverContent
                }
                style={{ ...floatingStyles }}
                {...motionProps}
                ref={setFloating}
                {...floatingProps}>
                {render({ close: () => setIsOpen(false) })}
              </motion.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}

// Wrap with error boundary for graceful error handling
const PopoverWithErrorBoundary = withFloatingErrorBoundary(Popover, 'Popover');

export default React.memo(PopoverWithErrorBoundary);
