/**
 * 站点统计工具
 */

import readingTime from 'reading-time';
import { memoizeBuild } from './build-cache';
import { getVisibleBlogPosts } from './content/repository';

function formatWordCount(count: number): string {
  if (count >= 1000) {
    return `${Math.floor(count / 1000)}k`;
  }
  return count.toString();
}

function formatReadingTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

async function calculateSiteStats() {
  const posts = await getVisibleBlogPosts();

  let totalWords = 0;
  let totalMinutes = 0;

  for (const post of posts) {
    const content = post.body || '';
    const stats = readingTime(content);

    totalWords += stats.words;
    totalMinutes += Math.ceil(stats.minutes);
  }

  return {
    totalWords,
    totalMinutes,
    formattedWords: formatWordCount(totalWords),
    formattedTime: formatReadingTime(totalMinutes),
    postCount: posts.length,
  };
}

const readSiteStats = memoizeBuild(calculateSiteStats);

/** 生产构建的各页面共享同一份统计，开发环境始终读取当前内容。 */
export async function getSiteStats() {
  return { ...(await readSiteStats()) };
}
