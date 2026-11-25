import { expect, test } from '@playwright/test';
import { setupRuntimeErrorCollector } from './helpers/runtime-errors';

test('desktop article disclosure responds to a real click before the sidebar hydrates', async ({
  page,
}) => {
  const runtime = setupRuntimeErrorCollector(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  let release = () => {};
  let requestedSidebar = false;
  const hydrationGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    /\/HomeSiderPanel(?:\.tsx|\.[^/]+\.js)(?:\?.*)?$/,
    async (route) => {
      requestedSidebar = true;
      await hydrationGate;
      await route.continue();
    },
  );
  const island = page.locator('.desktop-sidebar > astro-island');
  const summary = island.locator('summary[aria-label="文章菜单"]');
  const disclosure = island
    .locator('details')
    .filter({ has: page.locator('summary[aria-label="文章菜单"]') });
  const category = disclosure.getByRole('link', { name: '分类' });

  try {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => requestedSidebar).toBe(true);
    await expect(island).toHaveAttribute('ssr', '');
    await expect(category).toHaveCount(0);
    await summary.click();
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(category).toBeVisible();
    await summary.press('Space');
    await expect(category).toHaveCount(0);
    await summary.press('Enter');
    await expect(island).toHaveAttribute('ssr', '');
    await expect(category).toBeVisible();
  } finally {
    release();
  }

  await expect(island).not.toHaveAttribute('ssr');
  await expect(disclosure).toHaveAttribute('open', '');
  // Let the unrelated idle islands finish before replacing the document body.
  await expect(
    page.locator(
      'astro-island[ssr]:is(:has(#site-header), :has(#floating-nav), :has(#search-dialog))',
    ),
  ).toHaveCount(0);
  await category.click();
  await expect(page).toHaveURL(/\/blog\/categories\/?$/);
  await expect(summary).toHaveAttribute('data-route-active', 'true');
  await expect(category).toHaveAttribute('aria-current', 'page');
  runtime.assertClean();
});

test('the mobile article drawer hydrates segments and restores focus on close', async ({
  page,
}) => {
  const runtime = setupRuntimeErrorCollector(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blog/post/38', { waitUntil: 'domcontentloaded' });

  const opener = page.getByRole('button', { name: '打开菜单' });
  const drawer = page.locator('#mobile-drawer');
  const closer = drawer.getByRole('button', { name: '关闭菜单' });
  await expect(drawer).toHaveAttribute('inert', '');
  await opener.click();
  await expect(closer).toBeFocused();
  await expect(drawer).not.toHaveAttribute('inert');
  await page.keyboard.press('Shift+Tab');
  await expect
    .poll(() =>
      drawer.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);

  const series = drawer.getByRole('button', { name: '系列文章' });
  await series.click();
  await expect(series).toHaveAttribute('aria-pressed', 'true');
  await expect(
    drawer.locator('[data-slot-type="series"] [aria-current="page"]'),
  ).toHaveAttribute('href', '/blog/post/38');
  await drawer.getByRole('button', { name: '站点概览' }).click();
  await expect(drawer.locator('[data-slot-type="info"] img')).toHaveAttribute(
    'loading',
    'lazy',
  );
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveAttribute('inert', '');
  await expect(opener).toBeFocused();

  await opener.click();
  await expect(closer).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('#drawer-overlay')).toBeHidden();
  await expect(drawer).toHaveAttribute('inert', '');
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .not.toBe('hidden');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(opener).toHaveAttribute('aria-expanded', 'false');

  await page.goto('/resume', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#mobile-drawer')).toHaveCount(0);
  await expect(page.locator('#mobile-drawer-trigger')).toHaveCount(0);
  runtime.assertClean();
});

test('a drawer opened before its island hydrates keeps its closed markup inert', async ({
  page,
}) => {
  const runtime = setupRuntimeErrorCollector(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let release = () => {};
  const hydrationGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    /\/MobileDrawerPanel(?:\.tsx|\.[^/]+\.js)(?:\?.*)?$/,
    async (route) => {
      await hydrationGate;
      await route.continue();
    },
  );
  const drawer = page.locator('#mobile-drawer');

  try {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '打开菜单' }).click();
    await expect(page.locator('#mobile-drawer-trigger')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(drawer).toHaveAttribute('inert', '');
  } finally {
    release();
  }

  await expect(drawer.getByRole('button', { name: '关闭菜单' })).toBeFocused();
  runtime.assertClean();
});

test('the mobile heading follows an instant jump into a gap and clears at the top', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/blog/post/38/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '打开菜单' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: '移动站点导航' }),
  ).toHaveCount(0);

  const section = page
    .locator('article :is(h2, h3)')
    .filter({ hasText: /^实际使用示例$/ });
  const headingButton = page.getByRole('button', { name: '展开目录' });
  await section.evaluate((element) => {
    const headingTop = window.scrollY + element.getBoundingClientRect().top;
    window.scrollTo({ top: headingTop - 100, behavior: 'instant' });
  });
  await expect(headingButton).toContainText('实际使用示例');

  await section.evaluate((element) => {
    const headingBottom =
      window.scrollY + element.getBoundingClientRect().bottom;
    window.scrollTo({ top: headingBottom + 100, behavior: 'instant' });
  });
  await expect(headingButton).toContainText('实际使用示例');

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(headingButton).toHaveCount(0);
  await page.evaluate(() => {
    document.addEventListener(
      'astro:after-swap',
      () => {
        document.documentElement.dataset.mobileHeadingNavigation = 'true';
      },
      { once: true },
    );
  });
  await page.locator('#site-header a[href="/blog"]:visible').click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-mobile-heading-navigation',
    'true',
  );
  await expect(headingButton).toHaveCount(0);
});

test.describe('server-rendered sidebars', () => {
  test.use({ javaScriptEnabled: false });

  test('mobile navigation works on a direct article visit with JavaScript disabled', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog/post/38/', { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation', { name: '移动站点导航' });
    await expect(nav).toBeVisible();

    for (const [name, href] of [
      ['分类', '/blog/categories'],
      ['周刊', '/blog/weekly'],
      ['友链', '/blog/friends'],
      ['关于', '/blog/about'],
    ]) {
      const link = nav.getByRole('link', { name });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
    }

    const category = nav.getByRole('link', { name: '分类' });
    await category.click();
    await expect(page).toHaveURL(/\/blog\/categories\/?$/);
    await expect(category).toHaveAttribute('aria-current', 'page');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(nav).toBeHidden();
  });

  test('serialize only series links and render the closed drawer inert', async ({
    page,
  }) => {
    await page.goto('/blog/post/5', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mobile-drawer')).toHaveAttribute('inert', '');
    const islands = page.locator('.page-home-sider > astro-island[props]');
    await expect(islands).toHaveCount(2);

    const [desktop, mobile] = await islands.evaluateAll((elements) => {
      return elements.map((element) => {
        const rawProps = element.getAttribute('props') ?? '';
        type SerializedLink = [number, Record<string, unknown> | null];
        const props = JSON.parse(rawProps) as {
          seriesPostItems: [number, SerializedLink[]];
          prevPostItem: SerializedLink;
          nextPostItem: SerializedLink;
        };
        const links = props.seriesPostItems[1].map(([, link]) => link);
        return {
          bytes: new TextEncoder().encode(rawProps).byteLength,
          links,
          prev: props.prevPostItem[1],
          next: props.nextPostItem[1],
        };
      });
    });
    expect(desktop.links).toEqual(mobile.links);
    expect(desktop.prev).toEqual(mobile.prev);
    expect(desktop.next).toEqual(mobile.next);
    expect(desktop.bytes).toBeLessThan(16_384);
    expect(mobile.bytes).toBeLessThan(16_384);
    expect(desktop.links.length).toBeGreaterThan(0);
    for (const link of [...desktop.links, desktop.prev, desktop.next]) {
      if (link)
        expect(Object.keys(link).sort()).toEqual(['href', 'key', 'title']);
    }
    const sidebarIds = await page
      .locator('.page-home-sider [id]')
      .evaluateAll((elements) => elements.map(({ id }) => id));
    expect(new Set(sidebarIds).size).toBe(sidebarIds.length);
  });
});
