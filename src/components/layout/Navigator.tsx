import ButtonLink from '@components/control/ButtonLink';
import { isRoutePathActive, routers } from '@constants/router';
import { useCurrentPathname } from '@hooks/useCurrentPathname';
import { cn } from '@lib/utils';
import DropdownNav from './DropdownNav';
import ThemeToggle from '@components/theme/ThemeToggle';
import SearchWithDialog from './SearchWithDialog';

interface NavigatorProps {
  currentPath?: string;
}

export default function Navigator({ currentPath }: NavigatorProps) {
  const currentPathname = useCurrentPathname(currentPath);

  return (
    <div
      className="tablet:grow-0 flex grow items-center"
      style={{ viewTransitionName: 'page-header' }}>
      <div className="tablet:hidden flex grow items-center gap-4">
        {routers.map((item, index) => {
          const itemKey = item.path ?? item.name ?? `nav-item-${index}`;
          if (item.children?.length) {
            return (
              <DropdownNav
                key={itemKey}
                item={item}
                currentPath={currentPathname}
              />
            );
          }
          const isActive = isRoutePathActive(item.path, currentPathname);
          return (
            <ButtonLink
              key={itemKey}
              url={item.path}
              label={item.name}
              variant="unstyle"
              aria-current={isActive ? 'page' : undefined}
              data-header-route={item.path}
              className={cn(
                'relative text-base tracking-wider after:absolute after:bottom-1 after:left-1/2 after:block after:h-0.5 after:w-0 after:-translate-x-1/2 after:transition-all after:duration-300',
                isActive && 'after:w-9/12',
                !isActive && 'hover:after:w-9/12',
              )}>
              {item.icon && (
                <i className={`mr-1.5 ${item.icon}`} aria-hidden="true" />
              )}
              {item.name}
            </ButtonLink>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SearchWithDialog />
        <ThemeToggle />
      </div>
    </div>
  );
}
