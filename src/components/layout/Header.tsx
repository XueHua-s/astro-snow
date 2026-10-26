import logoSrc from 'src/assets/logo.webp?url';
import { MobilePostHeader } from '@components/layout/MobilePostHeader';
import { MAX_WIDTH } from '@constants/layout';
import { Routes } from '@constants/router';
import { blogLayoutConfig } from '@/config/blogLayoutConfig';
import Navigator from './Navigator';
import type { MarkdownHeading } from '@/types/markdown';
import { useHeaderScroll } from '@hooks/useHeaderScroll.ts';

interface Props {
  isPostPage?: boolean;
  tocNumbering?: boolean;
  tocHeadings?: MarkdownHeading[];
  currentPath?: string;
}

export default function Header({
  isPostPage = false,
  tocNumbering = true,
  tocHeadings,
  currentPath,
}: Props) {
  const { alternate, title, showLogo } = blogLayoutConfig;
  useHeaderScroll();

  return (
    <>
      <div
        id="site-header"
        className="fixed inset-x-0 top-0 z-10 gap-4 py-2.5 select-none tablet:py-2 tablet:pl-3 tablet:pr-3">
        <div className="site-header-bg pointer-events-none absolute inset-0"></div>
        {/* FIXED: A named transition ancestor prevents Chromium from diffusing
            the child backdrop. Snapshot only foreground chrome, not its material. */}
        <div
          className={`relative z-10 mx-auto flex items-center justify-between px-6 tablet:w-full tablet:px-0 ${MAX_WIDTH.content}`}
          style={{ viewTransitionName: 'site-header' }}>
          <a
            className="tablet:hidden -my-4 mr-4 flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap"
            href={Routes.Home}
            target="_self"
            title={alternate || title}
            data-tooltip-interactive="false"
            aria-label={alternate || title}
            suppressHydrationWarning
            data-astro-transition-persist="page-header-avatar"
            style={{ viewTransitionName: 'page-header-avatar' }}>
            {showLogo ? (
              <img
                src={logoSrc}
                alt={alternate || title}
                className="mt-2 mb-2 h-16"
              />
            ) : (
              <p className="logo-text text-primary">{alternate || title}</p>
            )}
          </a>
          <div className="tablet:flex w-full h-full tablet:grow hidden items-center justify-center">
            <MobilePostHeader
              isPostPage={isPostPage}
              enableNumbering={tocNumbering}
              sourceHeadings={tocHeadings}
              logoElement={showLogo ? 'svg' : 'text'}
              logoText={alternate || title}
              logoSrc={logoSrc}
            />
          </div>
          <Navigator currentPath={currentPath} />
        </div>
      </div>
    </>
  );
}
