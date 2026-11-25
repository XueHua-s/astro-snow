import { getCollection } from 'astro:content';

import type { BlogPost, BlogSchema } from '@/types/blog';
import { memoizeBuild } from '../build-cache';

async function fetchVisibleBlogPosts(): Promise<BlogPost[]> {
  return (await getCollection('blog', ({ data }: { data: BlogSchema }) => {
    const { draft } = data;
    return import.meta.env.PROD ? draft !== true : true;
  })) as BlogPost[];
}

const readVisiblePosts = memoizeBuild(fetchVisibleBlogPosts);
const readSortedDescPosts = memoizeBuild(() =>
  readVisiblePosts().then(sortPostsByDateDesc),
);
const readSortedAscPosts = memoizeBuild(() =>
  readVisiblePosts().then(sortPostsByDateAsc),
);

/**
 * 统一管理博客内容读取，避免在业务模块里重复写集合过滤细节。
 */
export async function getVisibleBlogPosts(): Promise<BlogPost[]> {
  return [...(await readVisiblePosts())];
}

/**
 * 文章稳定 key：优先短链接，其次 id。
 */
export function getPostStableKey(post: BlogPost): string {
  return post.data?.link ?? post.id ?? '';
}

/**
 * 按日期降序，日期相同时按 key 保持稳定顺序。
 */
export function sortPostsByDateDesc(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const dateDiff =
      new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return getPostStableKey(a).localeCompare(getPostStableKey(b));
  });
}

/**
 * 按日期升序，便于生成文章序号。
 */
export function sortPostsByDateAsc(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const dateDiff =
      new Date(a.data.date).getTime() - new Date(b.data.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return getPostStableKey(a).localeCompare(getPostStableKey(b));
  });
}

/**
 * 按置顶状态拆分文章，保持原顺序不变。
 */
export function splitPostsBySticky(posts: BlogPost[]): {
  stickyPosts: BlogPost[];
  nonStickyPosts: BlogPost[];
} {
  return posts.reduce(
    (result, post) => {
      if (post.data?.sticky) {
        result.stickyPosts.push(post);
      } else {
        result.nonStickyPosts.push(post);
      }
      return result;
    },
    {
      stickyPosts: [] as BlogPost[],
      nonStickyPosts: [] as BlogPost[],
    },
  );
}

/**
 * 统一提供按日期降序的可见文章，生产环境缓存，开发环境实时读取。
 */
export async function getVisibleBlogPostsSortedDesc(): Promise<BlogPost[]> {
  return [...(await readSortedDescPosts())];
}

/**
 * 统一提供按日期升序的可见文章，生产环境缓存，开发环境实时读取。
 */
export async function getVisibleBlogPostsSortedAsc(): Promise<BlogPost[]> {
  return [...(await readSortedAscPosts())];
}
