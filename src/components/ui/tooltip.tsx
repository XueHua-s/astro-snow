import React, { cloneElement, useEffect, useRef, type JSX } from 'react';
import {
  FloatingPortal,
  useDismiss,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Placement,
} from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
import { cn } from '@lib/utils';
import { zIndex } from '@constants/design-tokens';
import { withFloatingErrorBoundary } from '@components/common/FloatingErrorBoundary';

type TooltipProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  offsetX?: number;
  title: React.ReactNode;
  placement?: Placement;
  children: JSX.Element;
  className?: string;
};

function Tooltip({
  children,
  title,
  placement = 'top',
  offsetX = 5,
  className,
  open: passedOpen,
  onOpenChange,
}: TooltipProps) {
  // Use useControlledState for open/close state management
  const [open, setOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });

  const arrowRef = useRef<HTMLElement>(null);

  // Use useFloatingUI with arrow support
  const { refs, context, x, y, strategy } = useFloatingUI({
    open,
    onOpenChange: setOpen,
    placement,
    offset: offsetX,
    flipFallbackDirection: 'start',
    arrowRef,
  });

  // Configure interactions for tooltip behavior
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
  ]);
  const referenceRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (referenceRef.current) {
      refs.setReference(referenceRef.current);
    }
  }, [refs]);

  useEffect(() => {
    if (open && floatingRef.current) {
      refs.setFloating(floatingRef.current);
    }
  }, [open, refs]);

  const referenceProps = getReferenceProps();
  const floatingProps = getFloatingProps();

  return (
    <>
      {cloneElement(children, { ...referenceProps, ref: referenceRef })}
      <FloatingPortal id="floating-tooltip">
        {open && (
          <div
            className={cn(
              'bg-background/80 text-card-foreground z-10 rounded-lg border px-3 py-1 text-xs/3.5 backdrop-blur-lg',
              className,
            )}
            ref={floatingRef}
            style={{
              position: strategy,
              zIndex: zIndex.tooltip,
              top: y ?? 0,
              left: x ?? 0,
            }}
            {...floatingProps}>
            {title}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}

// Wrap with error boundary for graceful error handling
const TooltipWithErrorBoundary = withFloatingErrorBoundary(Tooltip, 'Tooltip');

export default TooltipWithErrorBoundary;
