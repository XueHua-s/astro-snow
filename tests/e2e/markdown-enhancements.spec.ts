import { expect, test, type Locator, type Page } from '@playwright/test';

const FIXTURE = '/blog/test-markdown';
const LIGHTBOX = '.markdown-image-lightbox';
const ENHANCER =
  '.custom-content astro-island[component-export="CustomContentEnhancer"]';

test.use({
  contextOptions: { reducedMotion: 'reduce' },
  viewport: { width: 1440, height: 900 },
});

async function openFixture(page: Page) {
  await page.goto(FIXTURE);
  await expect(page.locator('.custom-content')).toHaveAttribute(
    'data-enhanced',
    'true',
  );
}

async function transform(image: Locator) {
  return image.evaluate((img) => {
    const value = getComputedStyle(img).transform;
    const matrix = value === 'none' ? new DOMMatrix() : new DOMMatrix(value);
    return { scale: matrix.a, x: matrix.e, y: matrix.f };
  });
}

test('Markdown code and images can be enhanced again after island disposal', async ({
  page,
}) => {
  await openFixture(page);
  const block = page.locator('.custom-content .code-block-wrapper');
  const image = page.locator('.custom-content .markdown-image.loaded');
  await expect(block).toHaveCount(1);
  await expect(image).toBeVisible();

  await page.evaluate(async (selector) => {
    const island = document.querySelector(selector)!;
    const html = await fetch(location.href).then((response) => response.text());
    const fresh = new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector)!;
    island.dispatchEvent(new Event('astro:unmount'));
    if (document.querySelector('.custom-content .code-block-wrapper')) {
      throw new Error('The first island left its code controls attached');
    }
    island.replaceWith(fresh);
    document.dispatchEvent(new Event('astro:page-load'));
    document.dispatchEvent(new Event('astro:page-load'));
  }, ENHANCER);

  await expect(block).toHaveCount(1);
  await block.locator('.code-block-fullscreen').click();
  await expect(page.locator('#code-fullscreen-dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.locator('.custom-content .markdown-image-fullscreen').click();
  await expect(page.locator(`${LIGHTBOX}.active`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(`${LIGHTBOX}.active`)).toHaveCount(0);
});

test('native Markdown images are visible at their intrinsic ratio with JavaScript disabled', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto(FIXTURE);
    const image = page.getByAltText('Markdown fixture image');
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(image).toBeVisible();
    await expect(image).toHaveCSS('opacity', '1');

    const { nativeRatio, renderedRatio } = await image.evaluate(
      (img: HTMLImageElement) => {
        const { width, height } = img.getBoundingClientRect();
        return {
          nativeRatio: img.naturalWidth / img.naturalHeight,
          renderedRatio: width / height,
        };
      },
    );
    expect(nativeRatio).not.toBeCloseTo(16 / 9);
    expect(renderedRatio).toBeCloseTo(nativeRatio);
    await expect(page.locator('.markdown-image-fullscreen')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('disposing the enhancer releases a pending image to native loading', async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/img/img_9.png', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });

  const image = page.getByAltText('Markdown fixture image');
  try {
    await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' });
    await expect(image).toHaveClass(/\bpending\b/);
    await page.locator(ENHANCER).dispatchEvent('astro:unmount');
    await expect(image).not.toHaveClass(/\bpending\b/);
  } finally {
    release();
  }

  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(image).toHaveCSS('opacity', '1');
  await expect(image).not.toHaveClass(/\bloaded\b/);
  await expect(page.locator('.markdown-image-fullscreen')).toHaveCount(0);
});

test('disposing the enhancer removes the image error fallback', async ({
  page,
}) => {
  await page.route('**/img/img_9.png', (route) =>
    route.fulfill({ status: 404 }),
  );
  await openFixture(page);
  const image = page.getByAltText('Markdown fixture image');
  const fallback = page.getByRole('img', {
    name: '图片加载失败: Markdown fixture image',
  });
  await expect(image).toHaveClass(/\berror\b/);
  await expect(fallback).toBeVisible();

  await page.locator(ENHANCER).dispatchEvent('astro:unmount');
  await expect(fallback).toHaveCount(0);
  await expect(image).not.toHaveClass(/\berror\b/);
});

test('image wheel, drag and double-click share one transform across reopening', async ({
  page,
}) => {
  await openFixture(page);
  await page.locator('.custom-content .markdown-image.loaded').click();
  const image = page.locator(`${LIGHTBOX}-img.loaded`);
  await expect(image).toBeVisible();
  const initial = await image.boundingBox();
  const x = initial!.x + initial!.width / 2 + 35;
  const y = initial!.y + initial!.height / 2;

  await page.mouse.dblclick(x, y);
  expect(await transform(image)).toEqual({ scale: 2, x: -35, y: 0 });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y + 15);
  await page.mouse.up();
  expect(await transform(image)).toEqual({ scale: 2, x: -15, y: 15 });

  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await expect.poll(() => transform(image)).toMatchObject({ scale: 2.2 });

  await image.dblclick();
  expect(await transform(image)).toEqual({ scale: 1, x: 0, y: 0 });
  await image.dblclick();
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveClass(/lightbox-open/);

  await page.locator('.custom-content .markdown-image.loaded').click();
  await expect(image).toBeVisible();
  expect(await transform(image)).toEqual({ scale: 1, x: 0, y: 0 });
  await expect(image).toHaveCSS('cursor', 'zoom-in');
  await page.locator(`${LIGHTBOX}-close`).click();
  await expect(page.locator('body')).not.toHaveClass(/lightbox-open/);
});

test.describe('touch lightbox', () => {
  test.use({ hasTouch: true });

  test('pinch and one-finger pan compose and cancellation releases the pointer', async ({
    page,
    context,
  }) => {
    await openFixture(page);
    await page.locator('.custom-content .markdown-image.loaded').tap();
    const image = page.locator(`${LIGHTBOX}-img.loaded`);
    await expect(image).toBeVisible();
    const box = (await image.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const cdp = await context.newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: x - 30, y, id: 0 },
        { x: x + 30, y, id: 1 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: x - 60, y, id: 0 },
        { x: x + 60, y, id: 1 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(async () => (await transform(image)).scale)
      .toBeCloseTo(2);

    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 0 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 35, y: y + 25, id: 0 }],
    });
    await expect.poll(async () => (await transform(image)).x).toBeCloseTo(35);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    });
    await expect(image).toHaveCSS('cursor', 'grab');
  });
});

test('tweet hydration loads only for scoped placeholders and releases its root', async ({
  page,
}) => {
  const modules: string[] = [];
  const warnings: string[] = [];
  page.on('request', (request) => {
    if (/\/TweetEmbed(?:\.tsx|\.[^/.]+\.js)(?:\?.*)?$/.test(request.url()))
      modules.push(request.url());
  });
  page.on('console', (message) => {
    if (
      /synchronously unmount a root|already been passed to createRoot/.test(
        message.text(),
      )
    )
      warnings.push(message.text());
  });
  await page.route('https://cdn.syndication.twimg.com/**', (route) =>
    route.fulfill({ status: 404 }),
  );

  const outside = page.locator('#outside-tweet');
  const islandSelector =
    '.custom-content astro-island[component-url*="EmbedHydrator"]';
  await openFixture(page);
  await expect(page.locator(islandSelector)).not.toHaveAttribute('ssr');
  await expect(outside).not.toHaveAttribute('data-hydrated');
  expect(modules).toEqual([]);

  await page.goto(`${FIXTURE}/tweet`);
  const tweet = page.locator('.custom-content [data-tweet-embed]');
  await expect(tweet).toHaveAttribute('data-hydrated', 'true');
  expect(modules).toHaveLength(1);
  await expect(outside).not.toHaveAttribute('data-hydrated');

  await page.evaluate(async (selector) => {
    const island = document.querySelector(selector)!;
    const html = await fetch(location.href).then((response) => response.text());
    const fresh = new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector)!;
    island.dispatchEvent(new Event('astro:unmount'));
    if (
      document.querySelector(
        '.custom-content [data-tweet-embed][data-hydrated]',
      )
    ) {
      throw new Error('The first island retained the tweet ownership flag');
    }
    island.replaceWith(fresh);
  }, islandSelector);

  await expect(tweet).toHaveAttribute('data-hydrated', 'true');
  expect(warnings).toEqual([]);
});
