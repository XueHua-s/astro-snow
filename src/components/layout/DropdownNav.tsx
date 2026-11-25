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
  const { name, icon } = item;
  const hasActiveChild = item.children?.some((child) =>
    isRoutePathActive(child.path, currentPath),
  );

  const renderDropdownContent = useCallback(
    () => (
      <div className="nav-dropdown flex min-w-36 flex-col items-stretch p-1">
        {item.children?.length
          ? item.children.map((child: Router) => {
              const isActive = isRoutePathActive(child.path, currentPath);

              return (
                <a
                  key={child.path}
                  href={child.path}
                  aria-current={isActive ? 'page' : undefined}
                  data-header-route={child.path}
                  className="material-row w-full rounded-lg px-3 py-2 text-sm">
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
    // item is a stable reference from the static `routers` constant; use it
    // as the dep instead of item.children to avoid an always-new array dep.
    [item, currentPath],
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
          'header-nav-item inline-flex h-10 items-center gap-2 px-4 text-sm font-medium',
          className,
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${name}菜单`}
        data-header-route-group={name}
        data-route-active={hasActiveChild || undefined}>
        {icon && (
          <i className={cn('header-route-icon', icon)} aria-hidden="true" />
        )}
        {name}
        <i
          className={cn(
            'fa-solid fa-chevron-down text-[0.6rem] transition-transform duration-200 motion-reduce:transition-none',
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
