import { expect, test, type Page } from '@playwright/test';

const FIXTURE = '/blog/test-markdown';
const MERMAID = 'pre.mermaid';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

async function navigateFromAbout(page: Page) {
  await page.locator('main').evaluate((main, href) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = 'Markdown fixture';
    main.prepend(link);
  }, FIXTURE);
  await page.getByRole('link', { name: 'Markdown fixture' }).press('Enter');
  await expect(page).toHaveURL(new RegExp(`${FIXTURE}/?$`));
}

test('Mermaid fences render on first visit and retain usable source on failure', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    localStorage.theme = 'light';
  });
  await page.goto(FIXTURE);

  const valid = page.locator(MERMAID).first();
  const svg = valid.locator(':scope > svg');
  await expect(svg).toBeVisible();
  await expect(svg).toContainText('Bread & butter');
  await expect(page.locator('.mermaid-toolbar')).toHaveCount(2);
  await expect(page.locator(MERMAID).last()).toHaveAttribute(
    'data-mermaid-state',
    'fallback',
  );
  await expect(page.locator(MERMAID).last()).toHaveText(
    'invalid diagram <b>source</b>',
  );
  await expect(page.locator(MERMAID).last().locator('b, svg')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Fullscreen', exact: true }).last(),
  ).toBeDisabled();

  const id = await svg.getAttribute('id');
  await page.evaluate(() =>
    document.dispatchEvent(new Event('astro:page-load')),
  );
  await expect(svg).toHaveAttribute('id', id!);
  await page.locator('#theme-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(svg).not.toHaveAttribute('id', id!);
  await expect(page.locator('.mermaid-toolbar')).toHaveCount(2);

  await page
    .getByRole('button', { name: 'Copy source', exact: true })
    .first()
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('A["Bread & butter"]');
  await page
    .getByRole('button', { name: 'Fullscreen', exact: true })
    .first()
    .click();
  await expect(page.locator('#mermaid-fullscreen-svg > svg')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mermaid-fullscreen-dialog')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Mermaid starts after a diagram-free visit and renders again on return', async ({
  page,
}) => {
  await page.goto('/blog/about');
  await page.evaluate(() => {
    Object.defineProperty(window, 'markdownNavigation', { value: true });
  });
  await expect(page.locator(MERMAID)).toHaveCount(0);
  await navigateFromAbout(page);
  expect(await page.evaluate(() => 'markdownNavigation' in window)).toBe(true);
  await expect(page.locator(MERMAID).first().locator('svg')).toBeVisible();
  await page.locator('#fixture-back').press('Enter');
  await expect(page).toHaveURL(/\/blog\/about\/?$/);
  await expect(page.locator(MERMAID)).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(MERMAID).first().locator('svg')).toBeVisible();
  await expect(page.locator('.mermaid-toolbar')).toHaveCount(2);
});

test('a delayed Mermaid import can finish after an Astro navigation', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const module =
    /\/(?:mermaid\.js|mermaid\.core(?:\.[^/]+)?\.(?:m?js))(?:\?.*)?$/;
  let requested = false;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  await context.route(module, async (route) => {
    requested = true;
    await gate;
    await route.continue().catch(() => {});
  });

  try {
    await page.goto('/blog/about');
    expect(requested).toBe(false);
    await navigateFromAbout(page);
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator(MERMAID).first()).toHaveAttribute(
      'data-mermaid-state',
      'loading',
    );
    await page.locator('#fixture-back').press('Enter');
    await expect(page).toHaveURL(/\/blog\/about\/?$/);
    await expect(page.locator(MERMAID)).toHaveCount(0);
  } finally {
    release();
  }

  await page.goBack();
  await expect(
    page.locator(MERMAID).first().locator(':scope > svg'),
  ).toBeVisible();
  await expect(page.locator('.mermaid-toolbar')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('Mermaid source is readable with JavaScript disabled', async ({
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
    const source = page.locator(MERMAID).first().locator('code');
    await expect(source).toBeVisible();
    await expect(source).toContainText('A["Bread & butter"]');
    await expect(page.locator('.mermaid-toolbar')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
