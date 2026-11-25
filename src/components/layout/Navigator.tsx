import ButtonLink from '@components/control/ButtonLink';
import { isRoutePathActive, routers } from '@constants/router';
import { useCurrentPathname } from '@hooks/useCurrentPathname';
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
      <nav
        aria-label="主导航"
        className="tablet:hidden flex grow items-center gap-1">
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
              className="header-nav-item gap-2 text-sm font-medium">
              {item.icon && (
                <i
                  className={`header-route-icon ${item.icon}`}
                  aria-hidden="true"
                />
              )}
              {item.name}
            </ButtonLink>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <SearchWithDialog />
        <ThemeToggle />
      </div>
    </div>
  );
}
