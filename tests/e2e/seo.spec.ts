import { expect, test } from '@playwright/test';
import { blogLayoutConfig } from '../../src/config/blogLayoutConfig';
import { RK3528_POST_SLUG } from '../../src/lib/seo';

const site = new URL(blogLayoutConfig.site);
const canonical = (pathname: string) =>
  new URL(pathname.endsWith('/') ? pathname : `${pathname}/`, site).href;

test('public and private pages expose the expected indexing metadata', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    site.href,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    site.href,
  );
  const avatar = page.locator('[data-glass-hero] img');
  await expect(avatar).toHaveAttribute('fetchpriority', 'high');
  await expect(avatar).toHaveAttribute('srcset', /150w.*300w/);

  await page.goto('/blog');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    canonical('/blog'),
  );
  await expect(page.locator('link[rel="next"]')).toHaveAttribute(
    'href',
    canonical('/blog/posts/2'),
  );
  const cover = page.locator('#banner-box img');
  await expect(cover).toHaveAttribute('loading', 'eager');
  await expect(cover).toHaveAttribute('fetchpriority', 'high');
  await expect(cover).toHaveAttribute('srcset', /480w,\s+\S+ \d+w/);
  await expect(
    page.locator('a[aria-label="post-link"] img').first(),
  ).toHaveAttribute('loading', 'lazy');

  await page.goto('/blog/posts');
  const firstPageTitle = await page.title();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    canonical('/blog'),
  );

  await page.goto('/blog/posts/2');
  await expect(page).not.toHaveTitle(firstPageTitle);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    canonical('/blog/posts/2'),
  );
  await expect(page.locator('link[rel="prev"]')).toHaveAttribute(
    'href',
    canonical('/blog'),
  );
  await expect(page.getByRole('link', { name: '上一页' })).toHaveAttribute(
    'href',
    '/blog',
  );

  for (const path of [
    '/resume',
    '/blog/test-markdown',
    '/blog/test-markdown/tweet',
  ]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  }
});

test('a historical article link resolves to matching social and structured data', async ({
  page,
}) => {
  await page.goto(`/blog/post/${RK3528_POST_SLUG}`);
  await expect(page).toHaveURL(/\/blog\/post\/\d+\/?$/);
  const path = new URL(page.url()).pathname.replace(/\/$/, '');
  const url = canonical(path);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    'content',
    'article',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    url,
  );
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '',
  ) as { datePublished: string; image: string };
  expect(data).toMatchObject({
    '@type': 'BlogPosting',
    headline: expect.stringContaining('RK3528'),
    mainEntityOfPage: url,
    url,
    inLanguage: 'zh-CN',
    datePublished: expect.stringMatching(/^2026-02-07T/),
    image: expect.any(String),
  });
  await expect(
    page.locator('meta[property="article:published_time"]'),
  ).toHaveAttribute('content', data.datePublished);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    data.image,
  );
  expect(new URL(data.image).origin).toBe(site.origin);
  expect((await page.request.get(new URL(data.image).pathname)).ok()).toBe(
    true,
  );
});

test('alternate tag URLs keep the same listing and preferred canonical', async ({
  page,
}) => {
  for (const [preferred, alias] of [
    ['Node.js', 'node.js'],
    ['TypeScript', 'Typescript'],
  ]) {
    const path = `/blog/tags/${preferred}`;
    await page.goto(path);
    const articles = page.locator(
      '.category-second-level-container a[href^="/blog/post/"]',
    );
    const titles = await articles.allTextContents();
    expect(titles.length).toBeGreaterThan(1);

    const aliasResponse = await page.goto(`/blog/tags/${alias}`);
    expect(aliasResponse?.ok()).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      canonical(path),
    );
    await expect(articles).toHaveText(titles);
  }
});

test('related React articles have descriptions specific to their own content', async ({
  page,
}) => {
  const descriptions: string[] = [];
  for (const [title, pattern] of [
    ['React学习笔记', /内联样式/],
    ['React18学习笔记', /Redux.*路由/],
  ] as const) {
    await page.goto('/blog/tags/React');
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: title, level: 1 }),
    ).toBeVisible();
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', pattern);
    descriptions.push((await description.getAttribute('content')) ?? '');
  }
  expect(new Set(descriptions).size).toBe(2);
});

test('the public build serves font files without the generated reports', async ({
  request,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_SERVER === 'dev',
    'Font reports are removed from the static build',
  );
  for (const family of ['ChillRoundFRegular', 'ChillRoundFBold']) {
    const path = `/fonts/${family}/`;
    expect((await request.get(`${path}index.html`)).status()).toBe(404);

    const stylesheet = await request.get(`${path}result.css`);
    expect(stylesheet.ok()).toBe(true);
    const font = (await stylesheet.text()).match(
      /url\(['"]?([^'"()]+\.woff2)['"]?\)/,
    )?.[1];
    expect(font).toBeDefined();
    expect(
      (await request.head(new URL(font ?? '', stylesheet.url()).href)).ok(),
    ).toBe(true);
  }
});

test('the production sitemap lists real public pages and keeps private pages crawlable for noindex', async ({
  request,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_SERVER === 'dev',
    'Sitemap is generated by the static build',
  );
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain(
    `Sitemap: ${new URL('/sitemap.xml', site).href}`,
  );
  expect(robotsText).not.toContain('Disallow:');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  for (const path of [
    '/',
    '/blog',
    '/blog/posts/2',
    '/blog/tags/前端',
    '/blog/tags/AI Agent',
    '/blog/tags/Node.js',
    '/blog/tags/TypeScript',
  ]) {
    expect(locations).toContain(canonical(path));
  }
  for (const path of [
    '/resume',
    '/blog/posts',
    '/blog/test-markdown',
    '/blog/test-markdown/tweet',
    '/blog/tags/node.js',
    '/blog/tags/Typescript',
    `/blog/post/${RK3528_POST_SLUG}`,
  ]) {
    expect(locations).not.toContain(canonical(path));
  }
  expect(new Set(locations).size).toBe(locations.length);
});
