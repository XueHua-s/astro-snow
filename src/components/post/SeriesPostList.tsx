/**
 * SeriesPostList - 显示系列文章列表
 */
import { cn } from '@lib/utils';
import type { PostLinkItem } from '@lib/content/posts/types';

interface SeriesPostListProps {
  posts: PostLinkItem[];
  currentPostSlug?: string;
  className?: string;
}

export function SeriesPostList({
  posts,
  currentPostSlug,
  className,
}: SeriesPostListProps) {
  if (!posts?.length) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        暂无系列文章
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {posts.map(({ key, title, href }) => {
        const isActive = key === currentPostSlug;

        return (
          <a
            key={key}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex items-start gap-3 rounded-md px-1 py-2 transition-colors',
              'hover:bg-accent/50',
              isActive && 'text-primary font-medium',
            )}>
            {/* 圆点指示器 */}
            <span
              className={cn(
                'mt-2 h-2 w-2 shrink-0 rounded-full transition-colors',
                isActive
                  ? 'bg-primary'
                  : 'bg-muted-foreground/40 group-hover:bg-muted-foreground/60',
              )}
            />

            {/* 文章标题 */}
            <span
              className={cn(
                'line-clamp-2 flex-1 text-sm leading-relaxed transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-foreground group-hover:text-primary',
              )}>
              {title}
            </span>
          </a>
        );
      })}
    </div>
  );
}
