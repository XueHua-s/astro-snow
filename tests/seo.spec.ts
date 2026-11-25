import { describe, expect, it } from 'vitest';
import {
  buildSitemap,
  getCanonicalUrl,
  getShareImageUrl,
  RK3528_POST_SLUG,
  serializeJsonLd,
} from '../src/lib/seo';

const site = new URL('https://example.com/');

describe('site metadata', () => {
  it('canonicalizes page one and encodes route segments once', () => {
    expect(getCanonicalUrl('/blog/posts/?source=list', site).href).toBe(
      'https://example.com/blog/',
    );
    expect(getCanonicalUrl('/blog/tags/前端%20笔记/', site).href).toBe(
      'https://example.com/blog/tags/%E5%89%8D%E7%AB%AF%20%E7%AC%94%E8%AE%B0/',
    );
    expect(getCanonicalUrl('/blog/tags/node.js', site).href).toBe(
      'https://example.com/blog/tags/Node.js/',
    );
    expect(getCanonicalUrl('/blog/tags/Typescript', site).href).toBe(
      'https://example.com/blog/tags/TypeScript/',
    );
  });

  it('preserves local and external share images and falls back for invalid URLs', () => {
    const fallback = '/img/default.webp';
    expect(getShareImageUrl('/img/cover.webp', fallback, site).href).toBe(
      'https://example.com/img/cover.webp',
    );
    expect(
      getShareImageUrl('https://cdn.example.com/cover.webp', fallback, site)
        .href,
    ).toBe('https://cdn.example.com/cover.webp');
    expect(
      getShareImageUrl('data:image/png;base64,example', fallback, site)
        .pathname,
    ).toBe(fallback);
    expect(getShareImageUrl('https://[', fallback, site).pathname).toBe(
      fallback,
    );
  });

  it('serializes frontmatter that contains script markup as JSON text', () => {
    const article = { headline: '</ScRiPt><script>example</script>' };
    const script = serializeJsonLd(article);
    expect(script).not.toContain('<');
    expect(JSON.parse(script)).toEqual(article);
  });

  it('keeps only indexable canonical paths and XML-escapes URLs', () => {
    const sitemap = buildSitemap(
      [
        '/',
        '/blog',
        '/blog/',
        '/blog/posts',
        '/blog/posts/2',
        '/resume/',
        '/blog/test-markdown',
        '/blog/test-markdown/tweet',
        `/blog/post/${RK3528_POST_SLUG}`,
        '/blog/tags/R&D',
        '/blog/tags/Node.js',
        '/blog/tags/node.js',
      ],
      site,
    );

    expect(sitemap.match(/<loc>/g)).toHaveLength(5);
    expect(sitemap).toContain('<loc>https://example.com/blog/posts/2/</loc>');
    expect(sitemap).toContain(
      '<loc>https://example.com/blog/tags/R&amp;D/</loc>',
    );
    expect(sitemap).not.toMatch(
      /resume|test-markdown|rk3528|\/blog\/posts\/<\/loc>|\/blog\/tags\/node\.js\//,
    );
  });
});
