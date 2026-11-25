import type { Router } from '@constants/router';
import { Routes, isRoutePathActive } from '@constants/router';
import { cn } from '@lib/utils';
import { useCurrentPathname } from '@hooks/useCurrentPathname';
import ButtonLink from '@components/control/ButtonLink';
import Social from './Social';

export interface HomeInfoPanelProps {
  avatar: string;
  avatarGradient?: string;
  idPrefix: string;
  name?: string;
  description?: string;
  postCount: number;
  categoryCount: number;
  tagCount: number;
  routes: Router[];
  currentPath: string;
  className?: string;
}

export function HomeInfoPanel({
  avatar,
  avatarGradient,
  idPrefix,
  name,
  description,
  postCount,
  categoryCount,
  tagCount,
  routes,
  currentPath,
  className,
}: HomeInfoPanelProps) {
  const currentPathname = useCurrentPathname(currentPath);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className="h-40 w-40 rounded-full"
        style={
          avatarGradient ? { backgroundImage: avatarGradient } : undefined
        }>
        <img
          className="shadow-sm h-full w-full rounded-full transition"
          src={avatar}
          alt={`${name ?? ''} avatar`}
          loading="lazy"
          fetchPriority="low"
        />
      </div>

      <p className="mt-2">{name}</p>
      <p className="text-muted-foreground mt-3 text-center">{description}</p>
      <Social />
      <div className="text-muted-foreground mt-3 flex justify-center text-center text-sm/4 whitespace-nowrap select-none dark:text-white/80">
        <a
          href={Routes.Home}
          className="hover:text-blue flex cursor-pointer flex-col gap-2 p-1 transition">
          <span className="text-lg/5 font-bold">{postCount}</span>
          文章
        </a>
        <div className="bg-muted-foreground mx-3 w-px"></div>
        <a
          href={Routes.Categories}
          aria-label="分类"
          className="hover:text-blue">
          <p className="flex cursor-pointer flex-col gap-2 p-1 transition">
            <span className="text-lg/5 font-bold">{categoryCount}</span>
            分类
          </p>
        </a>
        <div className="bg-muted-foreground mx-3 w-px"></div>
        <a
          href={Routes.Tags}
          className="hover:text-blue flex cursor-pointer flex-col gap-2 p-1 transition">
          <span className="text-lg/5 font-bold">{tagCount}</span>
          标签
        </a>
      </div>
      <div className="mt-6 flex w-full flex-col items-center gap-2.5">
        {routes.map(({ name: routeName, path, icon, children }, index) => {
          if (children?.length) {
            const collapseId = `${idPrefix}-collapse-${index}`;
            const hasActiveChild = children.some((child) =>
              isRoutePathActive(child.path, currentPathname),
            );
            return (
              // FIXED: Native disclosure remains usable before the sidebar hydrates.
              <details
                key={collapseId}
                className="glass-tint group w-40 rounded-xl"
                open={hasActiveChild}
                suppressHydrationWarning>
                <summary
                  className="material-row flex-center h-12 w-full cursor-pointer list-none rounded-xl [&::-webkit-details-marker]:hidden"
                  aria-controls={collapseId}
                  aria-label={`${routeName}菜单`}
                  data-route-active={hasActiveChild || undefined}>
                  {icon && (
                    <i className={`mr-1.5 ${icon}`} aria-hidden="true" />
                  )}
                  {routeName}
                  <i
                    className="fa-solid fa-caret-down ml-2 text-base transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"></i>
                </summary>
                <div id={collapseId} className="flex flex-col items-center">
                  {children.map(
                    ({ name: childName, path: childPath, icon: childIcon }) => {
                      const isActive = isRoutePathActive(
                        childPath,
                        currentPathname,
                      );

                      return (
                        <ButtonLink
                          key={childPath}
                          url={childPath}
                          label={childName}
                          variant="unstyle"
                          aria-current={isActive ? 'page' : undefined}
                          data-sidebar-route={childPath}
                          className="material-row h-12 w-40 rounded-xl text-base tracking-wider">
                          {childIcon && (
                            <i
                              className={`mr-1.5 ${childIcon}`}
                              aria-hidden="true"
                            />
                          )}
                          {childName}
                        </ButtonLink>
                      );
                    },
                  )}
                </div>
              </details>
            );
          }

          const isActive = isRoutePathActive(path, currentPathname);

          return (
            <ButtonLink
              key={path}
              url={path}
              label={routeName}
              variant="unstyle"
              aria-current={isActive ? 'page' : undefined}
              data-sidebar-route={path}
              className="material-row h-12 w-40 rounded-xl text-base tracking-wider">
              {icon && <i className={`mr-1.5 ${icon}`} aria-hidden="true" />}
              {routeName}
            </ButtonLink>
          );
        })}
      </div>
    </div>
  );
}

export default HomeInfoPanel;
