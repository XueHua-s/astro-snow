/**
 * SeriesNavigation - 系列文章上一篇/下一篇导航
 */
import { cn } from '@lib/utils';
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
} from 'react-icons/ri';
import type { PostLinkItem } from '@lib/content/posts/types';

interface SeriesNavigationProps {
  prevPost: PostLinkItem | null;
  nextPost: PostLinkItem | null;
  className?: string;
}

export function SeriesNavigation({
  prevPost,
  nextPost,
  className,
}: SeriesNavigationProps) {
  if (!prevPost && !nextPost) {
    return null;
  }

  const scrollBehavior: ScrollBehavior = 'smooth';

  return (
    <div
      className={cn(
        'border-border mt-4 flex flex-col gap-3 border-t pt-4 md:mt-0 md:pt-2',
        className,
      )}>
      {/* 文章导航 */}
      <div className="flex items-center justify-between gap-2">
        {/* 上一篇 */}
        {prevPost ? (
          <a
            href={prevPost.href}
            className={cn(
              'group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-primary',
              'max-w-[45%] min-w-0 flex-1',
            )}
            title={prevPost.title}
            suppressHydrationWarning>
            <RiArrowLeftSLine className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">{prevPost.title}</span>
          </a>
        ) : (
          <div className="max-w-[45%] flex-1" />
        )}

        {/* 下一篇 */}
        {nextPost ? (
          <a
            href={nextPost.href}
            className={cn(
              'group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-primary',
              'max-w-[45%] min-w-0 flex-1 justify-end text-right',
            )}
            title={nextPost.title}
            suppressHydrationWarning>
            <span className="truncate text-xs">{nextPost.title}</span>
            <RiArrowRightSLine className="h-4 w-4 shrink-0" />
          </a>
        ) : (
          <div className="max-w-[45%] flex-1" />
        )}
      </div>

      {/* 回到顶部和滚到底部 */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior })}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
            'hover:bg-accent text-muted-foreground hover:text-primary text-xs',
          )}
          title="回到顶部"
          aria-label="回到顶部"
          suppressHydrationWarning>
          <RiArrowUpSLine className="h-4 w-4" />
          回到顶部
        </button>
        <button
          onClick={() =>
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: scrollBehavior,
            })
          }
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
            'hover:bg-accent text-muted-foreground hover:text-primary text-xs',
          )}
          title="滚到底部"
          aria-label="滚到底部"
          suppressHydrationWarning>
          <RiArrowDownSLine className="h-4 w-4" />
          滚到底部
        </button>
      </div>
    </div>
  );
}
