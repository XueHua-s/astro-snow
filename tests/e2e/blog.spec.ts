import { expect, test, type Locator } from '@playwright/test';
import { BLOG_ROUTES } from './helpers/blog-routes';
import { setupRuntimeErrorCollector } from './helpers/runtime-errors';

async function expectMoreTabFlush(card: Locator, corner: 'left' | 'right') {
  await expect
    .poll(
      () =>
        card.evaluate((element, side) => {
          const button = element.querySelector<HTMLElement>(
            'a[aria-label="more info"] button',
          );
          if (!button) throw new Error('More tab is missing');
          const cardRect = element.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          const cardStyle = getComputedStyle(element);
          const buttonStyle = getComputedStyle(button);
          const radiusProperty =
            side === 'right'
              ? 'borderBottomRightRadius'
              : 'borderBottomLeftRadius';
          return Math.max(
            Math.abs(buttonRect[side] - cardRect[side]),
            Math.abs(buttonRect.bottom - cardRect.bottom),
            Math.abs(
              parseFloat(buttonStyle[radiusProperty]) -
                parseFloat(cardStyle[radiusProperty]),
            ),
          );
        }, corner),
      {
        message: `More tab must match the card's bottom-${corner} edge and radius`,
      },
    )
    .toBeLessThan(0.5);
  await expectMoreTabsClear(card);
}

async function expectMoreTabsClear(cards: Locator) {
  await expect
    .poll(
      () =>
        cards.evaluateAll((elements) =>
          elements.flatMap((card, index) => {
            const button = card.querySelector<HTMLElement>(
              'a[aria-label="more info"] button',
            );
            if (!button) throw new Error('More tab is missing');
            const buttonRect = button.getBoundingClientRect();
            return Array.from(
              card.querySelectorAll<HTMLElement>(
                'p, h1, [data-post-tags] > div',
              ),
            ).flatMap((content) => {
              const rect = content.getBoundingClientRect();
              const overlapX =
                Math.min(rect.right, buttonRect.right) -
                Math.max(rect.left, buttonRect.left);
              const overlapY =
                Math.min(rect.bottom, buttonRect.bottom) -
                Math.max(rect.top, buttonRect.top);
              return rect.width > 0 &&
                rect.height > 0 &&
                overlapX > 0.5 &&
                overlapY > 0.5
                ? [{ card: index, text: content.textContent?.trim() }]
                : [];
            });
          }),
        ),
      {
        message:
          'More tabs must not cover visible tags, titles or descriptions',
      },
    )
    .toEqual([]);
}

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

  test('cover banner image should be painted above the ambient layer', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    const response = await page.goto('/blog', {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status()).toBe(200);

    await expect(page.locator('.site-ambient')).toHaveCount(1);

    await expect
      .poll(
        async () =>
          page
            .locator('#banner-box img')
            .evaluate((img) => (img as HTMLImageElement).naturalWidth),
        { timeout: 10000 },
      )
      .toBeGreaterThan(0);

    await page.locator('#banner-box img').evaluate(async (img) => {
      await (img as HTMLImageElement).decode().catch(() => undefined);
    });

    const state = await page.locator('#banner-box').evaluate((box) => {
      const img = box.querySelector('img');
      const coverRoot = box.parentElement;
      if (!img || !coverRoot) return null;
      return {
        visibility: getComputedStyle(img).visibility,
        zIndex: getComputedStyle(box).zIndex,
        isolation: getComputedStyle(coverRoot).isolation,
      };
    });

    expect(state).not.toBeNull();
    expect(state?.visibility).not.toBe('hidden');
    expect(state?.zIndex).toBe('-10');
    expect(state?.isolation).toBe('isolate');

    const bannerBox = await page.locator('#banner-box').boundingBox();
    if (!bannerBox) {
      throw new Error('Banner box is not visible');
    }

    // The banner image is opaque: hiding the ambient layer behind it must not
    // change a single pixel. If the ambient paints above the banner, the
    // screenshots differ.
    const clip = {
      x: bannerBox.x + 20,
      y: bannerBox.y + 100,
      width: 120,
      height: 100,
    };
    const before = await page.screenshot({ clip });
    await page.addStyleTag({
      content: '.site-ambient{display:none!important}',
    });
    await page.waitForTimeout(100);
    const after = await page.screenshot({ clip });

    expect(Buffer.compare(before, after)).toBe(0);

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
        .locator('main [data-glass-panel]')
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

  test('series post navigation should not overlap sidebar panels', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog/post/38', { waitUntil: 'domcontentloaded' });
    const desktopSidebar = page.locator('.page-home-sider').first();

    await desktopSidebar
      .locator('#inner-home-sider [data-segment-value="series"]')
      .click();
    await expect(
      desktopSidebar.locator('[data-slot-type="series"]'),
    ).toBeVisible();

    const seriesLink = desktopSidebar
      .locator('[data-slot-type="series"] a')
      .filter({
        hasText: 'Rust Cow（Clone-On-Write）学习笔记：理解 Borrowed 状态',
      })
      .first();

    await Promise.all([
      page.waitForURL('**/blog/post/37', { timeout: 30000 }),
      seriesLink.click(),
    ]);

    const visibleSidebarSlots = await desktopSidebar
      .locator('[data-slot-type]:visible')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          type: node.getAttribute('data-slot-type'),
          text: node.textContent?.trim()?.slice(0, 80) ?? '',
        })),
      );

    expect(visibleSidebarSlots).toHaveLength(1);
    expect(visibleSidebarSlots[0]?.type).toBe('directory');
    await expect(desktopSidebar.locator('[data-slot-type="info"]')).toHaveCount(
      0,
    );
    await expect(
      desktopSidebar.locator('[data-slot-type="directory"]'),
    ).toBeVisible();

    runtime.assertClean();
  });

  test('left sidebar active route should follow client navigation', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const desktopSidebar = page.locator('.page-home-sider').first();
    const homeLink = desktopSidebar.locator('[data-sidebar-route="/blog"]');
    const articleButton = desktopSidebar.getByRole('button', {
      name: '文章菜单',
    });
    const headerHomeLink = page.locator(
      '#site-header [data-header-route="/blog"]',
    );
    const headerArticleButton = page.locator(
      '#site-header [data-header-route-group="文章"]',
    );
    const categoryLink = desktopSidebar.locator(
      '[data-sidebar-route="/blog/categories"]',
    );
    const tagLink = desktopSidebar.locator('[data-sidebar-route="/blog/tags"]');

    await expect(desktopSidebar).toBeVisible();
    await expect(homeLink).toHaveAttribute('aria-current', 'page');
    await expect(headerHomeLink).toHaveAttribute('aria-current', 'page');

    await articleButton.click();
    await Promise.all([
      page.waitForURL('**/blog/categories', { timeout: 30000 }),
      categoryLink.click(),
    ]);

    await expect(articleButton).toHaveAttribute('data-route-active', 'true');
    await expect(headerArticleButton).toHaveAttribute(
      'data-route-active',
      'true',
    );
    await expect(categoryLink).toHaveAttribute('aria-current', 'page');
    await expect(homeLink).not.toHaveAttribute('aria-current', 'page');
    await expect(headerHomeLink).not.toHaveAttribute('aria-current', 'page');

    await Promise.all([
      page.waitForURL('**/blog/tags', { timeout: 30000 }),
      tagLink.click(),
    ]);

    await expect(articleButton).toHaveAttribute('data-route-active', 'true');
    await expect(tagLink).toHaveAttribute('aria-current', 'page');
    await expect(categoryLink).not.toHaveAttribute('aria-current', 'page');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/blog\/categories$/);
    await expect(categoryLink).toHaveAttribute('aria-current', 'page');
    await expect(tagLink).not.toHaveAttribute('aria-current', 'page');

    await page.goto('/blog/categories/学习笔记', {
      waitUntil: 'domcontentloaded',
    });
    await expect(articleButton).toHaveAttribute('data-route-active', 'true');
    await expect(headerArticleButton).toHaveAttribute(
      'data-route-active',
      'true',
    );
    await expect(categoryLink).toHaveAttribute('aria-current', 'page');

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

  test('floating group capsule should shrink when collapsed', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const capsule = page.locator('#floating-nav > .glass');
    await expect(capsule).toBeVisible();

    const expandedBox = await capsule.boundingBox();
    if (!expandedBox) {
      throw new Error('Floating group capsule is not visible when expanded');
    }

    await page.locator('#toggle-nav').click();
    await page.waitForTimeout(500);

    const collapsedBox = await capsule.boundingBox();
    if (!collapsedBox) {
      throw new Error('Floating group capsule is not visible when collapsed');
    }

    // Regression guard: the collapsed capsule must actually lose the height of
    // #nav-content instead of keeping an empty glass area above the toggle.
    expect(collapsedBox.height).toBeLessThan(70);
    expect(expandedBox.height).toBeGreaterThanOrEqual(collapsedBox.height + 30);

    runtime.assertClean();
  });

  for (const { name, route, hasCover } of [
    { name: 'post', route: '/blog', hasCover: true },
    { name: 'no-cover post', route: '/blog/weekly', hasCover: false },
  ]) {
    test(`${name} card more tabs should stay flush in all interaction states`, async ({
      page,
    }) => {
      const runtime = setupRuntimeErrorCollector(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const cards = page.locator('.glass-card.glass-interactive');
      await expect(cards.nth(1)).toBeVisible();

      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const dark of [false, true]) {
          await page.evaluate((enabled) => {
            document.documentElement.classList.toggle('dark', enabled);
          }, dark);
          for (const index of hasCover ? [0, 1, 3] : [0, 1]) {
            const card = cards.nth(index);
            const button = card.locator('a[aria-label="more info"] button');
            const corner =
              hasCover && index % 2 === 1 && width > 768 ? 'left' : 'right';
            await page.mouse.move(0, 0);
            await button.evaluate((element) =>
              element.scrollIntoView({ block: 'center', behavior: 'instant' }),
            );
            await expectMoreTabFlush(card, corner);

            await button.hover();
            await button.evaluate(async (element) => {
              await Promise.all(
                element.getAnimations().map((animation) => animation.finished),
              );
            });
            await expectMoreTabFlush(card, corner);

            await page.mouse.move(0, 0);
            await button.focus();
            await expect(button).toBeFocused();
            await expectMoreTabFlush(card, corner);
          }
        }
      }
      runtime.assertClean();
    });
  }

  test('post card more tabs should not cover tags or text at any breakpoint', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.glass-card.glass-interactive');
    await expect(cards.nth(3)).toBeAttached();
    for (const width of [
      1440, 1380, 1280, 1024, 993, 992, 769, 768, 390, 320,
    ]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dark of [false, true]) {
        await page.evaluate((enabled) => {
          document.documentElement.classList.toggle('dark', enabled);
        }, dark);
        await expectMoreTabsClear(cards);
      }
    }
    runtime.assertClean();
  });

  test('post footer should handle many, long and empty tags without clipping controls', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.glass-card.glass-interactive');
    const labels = [
      Array.from({ length: 12 }, (_, index) => `标签-${index + 1}`),
      ['LongUnbrokenTag'.repeat(12), '中文长标签'.repeat(20)],
      [],
    ];
    for (const tags of labels) {
      for (const index of [0, 1]) {
        await cards
          .nth(index)
          .locator('[data-post-tags]')
          .evaluate((group, texts) => {
            const template = group.firstElementChild;
            if (!template)
              throw new Error('Tag fixture requires an existing badge');
            group.replaceChildren(
              ...texts.map((text) => {
                const badge = template.cloneNode(true) as HTMLElement;
                const label = badge.querySelector('span');
                if (!label) throw new Error('Tag label is missing');
                label.textContent = text;
                return badge;
              }),
            );
          }, tags);
      }
      for (const width of [1440, 1280, 1024, 769, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        for (const index of [0, 1]) {
          const card = cards.nth(index);
          const badges = card.locator('[data-post-tags] > div');
          await expect(badges).toHaveCount(tags.length);
          await expectMoreTabsClear(card);
          const overflowing = await badges.evaluateAll((elements) =>
            elements
              .filter((badge) => {
                const parent = badge.parentElement;
                if (!parent) throw new Error('Tag group is missing');
                const group = parent.getBoundingClientRect();
                const rect = badge.getBoundingClientRect();
                return (
                  rect.width === 0 ||
                  rect.height === 0 ||
                  rect.left < group.left - 0.5 ||
                  rect.right > group.right + 0.5
                );
              })
              .map((badge) => badge.textContent?.trim()),
          );
          expect(overflowing).toEqual([]);
          const corner = index === 1 && width > 768 ? 'left' : 'right';
          await expectMoreTabFlush(card, corner);
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
    }
    runtime.assertClean();
  });

  test('category card more tab should stay flush after flipping', async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const flip = page.locator('.flip-card').first();
    const card = flip.locator('.flip-card-back .glass-card');
    const button = card.locator('a[aria-label="more info"] button');

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const dark of [false, true]) {
        await page.evaluate((enabled) => {
          document.documentElement.classList.toggle('dark', enabled);
        }, dark);
        await flip.evaluate((element) =>
          element.scrollIntoView({ block: 'center', behavior: 'instant' }),
        );
        await flip.hover();
        await flip.locator('.flip-card-inner').evaluate(async (element) => {
          await Promise.all(
            element.getAnimations().map((animation) => animation.finished),
          );
        });
        await expectMoreTabFlush(card, 'right');
        await button.hover();
        await button.evaluate(async (element) => {
          await Promise.all(
            element.getAnimations().map((animation) => animation.finished),
          );
        });
        await expectMoreTabFlush(card, 'right');
        await button.focus();
        await expect(button).toBeFocused();
        await expectMoreTabFlush(card, 'right');
      }
    }
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
