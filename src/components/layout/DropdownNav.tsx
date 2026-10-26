import { memo, useCallback } from 'react';
import Popover from '@components/ui/popover';
import { isRoutePathActive, type Router } from '@constants/router';
import { useToggle } from '@hooks/useToggle';
import { cn } from '@lib/utils';
import { withFloatingErrorBoundary } from '@components/common/FloatingErrorBoundary';

interface DropdownNavProps {
  item: Router;
  className?: string;
  currentPath?: string;
}

const DropdownNavComponent = ({
  item,
  className,
  currentPath,
}: DropdownNavProps) => {
  const { isOpen, setIsOpen } = useToggle({ defaultOpen: false });
  const { name, icon, children } = item;
  const hasActiveChild = children?.some((child) =>
    isRoutePathActive(child.path, currentPath),
  );

  const renderDropdownContent = useCallback(
    () => (
      <div className="nav-dropdown flex flex-col items-stretch p-1">
        {children?.length
          ? children.map((child: Router) => {
              const isActive = isRoutePathActive(child.path, currentPath);

              return (
                <a
                  key={child.path}
                  href={child.path}
                  aria-current={isActive ? 'page' : undefined}
                  data-header-route={child.path}
                  className="material-row w-full rounded-lg px-4 py-2 text-base">
                  <div className="flex items-center gap-2">
                    {child.icon && (
                      <i
                        className={cn('text-sm', child.icon)}
                        aria-hidden="true"
                      />
                    )}
                    {child.name}
                  </div>
                </a>
              );
            })
          : null}
      </div>
    ),
    [children, currentPath],
  );

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      trigger="hover"
      className="glass-menu"
      render={renderDropdownContent}>
      <button
        className={cn(
          'inline-flex h-10 items-center px-4 py-2 text-base tracking-wider',
          'relative after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-0',
          'after:-translate-x-1/2 after:transition-[width] after:duration-300 after:content-[""]',
          hasActiveChild && 'after:w-9/12',
          className,
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${name}菜单`}
        data-header-route-group={name}
        data-route-active={hasActiveChild || undefined}>
        {icon && (
          <i className={cn('mr-1.5 text-sm', icon)} aria-hidden="true" />
        )}
        {name}
        <i
          className={cn(
            'fa-solid fa-caret-down absolute -right-1.5 text-xl transition-transform duration-300',
            {
              'rotate-180': isOpen,
            },
          )}
          aria-hidden="true"
        />
      </button>
    </Popover>
  );
};

// Memoize component for performance
const DropdownNav = memo(DropdownNavComponent);

// Wrap with error boundary for graceful error handling
const DropdownNavWithErrorBoundary = withFloatingErrorBoundary(
  DropdownNav,
  'DropdownNav',
);

export default DropdownNavWithErrorBoundary;
