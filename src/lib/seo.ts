import { Routes, normalizeRoutePath } from '../constants/router.js';
import { getCanonicalTagName } from './content/tags.js';

export const SITE_LANGUAGE = 'zh-CN';
export const RK3528_POST_SLUG = 'rk3528开发板部署openclaw-telegram-bot全记录';

const postListFirstPage: string = Routes.Posts;
const tagPathPrefix = `${Routes.Tags}/`;
const nonIndexablePaths = new Set([
  '/404',
  '/resume',
  '/blog/test-markdown',
  `${Routes.Post}/${encodeURIComponent(RK3528_POST_SLUG)}`,
]);

export function getCanonicalUrl(path: string, site: URL | string): URL {
  const pathname = normalizeRoutePath(path);
  // FIXED: The blog landing page also serves as page one of the post list.
  let canonicalPath = pathname === postListFirstPage ? Routes.Home : pathname;
  if (pathname.startsWith(tagPathPrefix)) {
    const tag = pathname.slice(tagPathPrefix.length);
    canonicalPath = `${tagPathPrefix}${getCanonicalTagName(tag)}`;
  }
  // GitHub Pages serves directory indexes at trailing-slash URLs.
  return new URL(canonicalPath === '/' ? '/' : `${canonicalPath}/`, site);
}

export function getShareImageUrl(
  image: string | undefined,
  fallback: string,
  site: URL,
): URL {
  const fallbackUrl = new URL(fallback, site);
  if (!image?.trim()) return fallbackUrl;

  try {
    const url = new URL(image, site);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url
      : fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

export function serializeJsonLd(data: Record<string, unknown>): string {
  // FIXED: A frontmatter string cannot close the enclosing script element.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function buildSitemap(paths: string[], site: URL | string): string {
  const links = new Set<string>();
  for (const path of paths) {
    const url = getCanonicalUrl(path, site);
    if (
      !nonIndexablePaths.has(normalizeRoutePath(url.pathname)) &&
      !url.pathname.startsWith('/blog/test-markdown/') &&
      normalizeRoutePath(path) !== postListFirstPage
    ) {
      links.add(url.href);
    }
  }

  const urls = [...links]
    .sort()
    .map((link) => `  <url><loc>${link.replace(/&/g, '&amp;')}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
