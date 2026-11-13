import type { BlogPost } from '@/types/blog';
import { getPostHref, getPostLastCategory } from '@lib/content';

interface Props {
  posts: BlogPost[];
  postIndexMap: Map<string, number>;
}

export default function RandomPostList({ posts, postIndexMap }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-foreground/80 text-2xl font-semibold">推荐文章</h2>
      {posts && posts.length > 0 && (
        <div className="flex flex-col gap-2">
          {posts.map((post, index) => {
            const category = getPostLastCategory(post);
            return (
              <a
                key={post.id}
                href={getPostHref(post, postIndexMap)}
                className="material-row group flex gap-3 rounded-md p-2 text-sm hover:text-primary">
                <span className="text-foreground/30 shrink-0 font-mono">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {category.name && (
                    <div className="text-foreground/50 truncate text-xs">
                      {category.name}
                    </div>
                  )}
                  <div className="text-foreground/80 group-hover:text-primary line-clamp-2 transition-colors">
                    {post.data.title}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
