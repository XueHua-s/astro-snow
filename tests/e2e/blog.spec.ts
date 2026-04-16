import { expect, test } from '@playwright/test';
import { BLOG_ROUTES } from './helpers/blog-routes';
import { setupRuntimeErrorCollector } from './helpers/runtime-errors';

test.describe('Blog e2e regression suite', () => {
  test('home blog page should render and expose post links', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    const response = await page.goto('/blog', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);

    await expect(page.locator('main')).toBeVisible();
    await expect(
      page.locator('a[aria-label="post-link"]').first(),
    ).toBeVisible();
    await page.waitForTimeout(1200);

    runtime.assertClean();
  });

  for (const path of BLOG_ROUTES) {
    test(`route should be accessible: ${path}`, async ({ page }) => {
      const runtime = setupRuntimeErrorCollector(page);
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      expect(response?.status(), `route ${path}`).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForTimeout(600);
      runtime.assertClean();
    });
  }

  test('about page should render github section markdown images', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    const response = await page.goto('/blog/about', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Skills' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '📌 Participation in projects' }),
    ).toBeVisible();

    await expect
      .poll(
        async () =>
          page
            .locator(
              '.custom-content .markdown-image.loaded, .custom-content .markdown-image.error',
            )
            .count(),
        { timeout: 15000 },
      )
      .toBeGreaterThanOrEqual(7);

    await expect(
      page
        .locator(
          '.custom-content .markdown-image.loaded, .custom-content .markdown-image.error',
        )
        .first(),
    ).toBeVisible();

    runtime.assertClean();
  });

  test('category pages should not render stray zero text nodes', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    for (const path of [
      '/blog/categories',
      '/blog/categories/学习笔记',
      '/blog/categories/weekly',
    ]) {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      expect(response?.status(), `route ${path}`).toBe(200);

      const zeroTextNodes = await page
        .locator('main .shadow-box')
        .first()
        .evaluate((element) => {
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(node) {
                return node.textContent?.trim() === '0'
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_SKIP;
              },
            },
          );

          let count = 0;
          while (walker.nextNode()) {
            count += 1;
          }

          return count;
        });

      expect(zeroTextNodes, `stray zero text nodes on ${path}`).toBe(0);
    }

    runtime.assertClean();
  });

  test('should navigate from list page to a post detail page', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const firstPostLink = page.locator('a[aria-label="post-link"]').first();
    await expect(firstPostLink).toBeVisible();

    const href = await firstPostLink.getAttribute('href');
    expect(href).toBeTruthy();
    await Promise.all([
      page.waitForURL(/\/blog\/post\//, { timeout: 30000 }),
      firstPostLink.click(),
    ]);

    await expect(page.locator('article')).toBeVisible();
    await page.waitForTimeout(1200);

    runtime.assertClean();
  });

  test('search dialog should open and close via keyboard', async ({ page }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('#search-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.locator('#search-dialog');
    await expect(dialog).toBeVisible();
    await expect(
      page.locator('#search-dialog-container .pagefind-ui__search-input'),
    ).toBeVisible({ timeout: 15000 });

    const searchInput = page.locator('.pagefind-ui__search-input').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('react');
    await page.waitForTimeout(600);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(600);

    runtime.assertClean();
  });

  test('theme toggle should switch html theme state', async ({ page }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const toggle = page.locator('#theme-toggle-btn');
    await expect(toggle).toBeVisible();

    const beforeTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? '',
    );
    await toggle.click();
    await page.waitForTimeout(300);
    const afterTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? '',
    );

    expect(afterTheme).toBeTruthy();
    expect(afterTheme).not.toBe(beforeTheme);

    runtime.assertClean();
  });

  test('floating group controls should work on desktop', async ({ page }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(300);

    const toTop = page.locator('#scroll-to-top');
    await expect(toTop).toBeVisible();
    await toTop.click();
    await page.waitForTimeout(600);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThan(50);

    runtime.assertClean();
  });

  test('mobile drawer should open and close', async ({ page }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const openBtn = page.locator('[aria-label="打开菜单"]').first();
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const drawer = page.locator('#mobile-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.locator('#drawer-overlay')).toBeVisible();

    await page.locator('[aria-label="关闭菜单"]').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('#drawer-overlay')).toBeHidden();

    runtime.assertClean();
  });

  test('post sidebar should not create nested scrollbars in toc container', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/post/30', { waitUntil: 'domcontentloaded' });

    const tocContainer = page.locator('.toc-container:visible').first();
    await expect(tocContainer).toBeVisible();

    const tocOverflowY = await tocContainer.evaluate(
      (el) => window.getComputedStyle(el).overflowY,
    );
    expect(tocOverflowY).not.toBe('auto');
    expect(tocOverflowY).not.toBe('scroll');

    runtime.assertClean();
  });
});
