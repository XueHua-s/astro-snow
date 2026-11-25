import { expect, test, type Page } from '@playwright/test';

test.use({ colorScheme: 'dark', contextOptions: { reducedMotion: 'reduce' } });

async function navigateToAbout(page: Page) {
  await page.evaluate(() => {
    document.addEventListener(
      'astro:after-swap',
      () => {
        document.documentElement.dataset.testSwapped = 'true';
      },
      { once: true },
    );
  });
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name: '关于' })
    .click();
  await expect(page).toHaveURL(/\/blog\/about\/?$/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-test-swapped',
    'true',
  );
}

test('starts with the browser theme and only stores an explicit choice', async ({
  page,
}) => {
  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: 'toggle theme' });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await page.goto('/blog', { waitUntil: 'domcontentloaded' });
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(
    'light',
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('keeps an explicit choice and pressed state across client navigation with denied storage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage denied', 'SecurityError');
      },
    });
  });

  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: 'toggle theme' });
  await page.goto('/blog', { waitUntil: 'domcontentloaded' });
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await navigateToAbout(page);
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('syncs changes, removal, and clear from another tab across client navigation', async ({
  context,
  page,
}) => {
  const otherTab = await context.newPage();
  await otherTab.goto('/blog', { waitUntil: 'domcontentloaded' });
  await page.goto('/blog', { waitUntil: 'domcontentloaded' });

  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: 'toggle theme' });
  const otherToggle = otherTab.getByRole('button', { name: 'toggle theme' });
  await expect(otherToggle).toHaveAttribute('aria-pressed', 'true');
  await otherToggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await navigateToAbout(page);
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await otherTab.evaluate(() => localStorage.removeItem('theme'));
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();

  await otherTab.evaluate(() => localStorage.setItem('theme', 'light'));
  await expect(root).toHaveAttribute('data-theme', 'light');
  await otherTab.evaluate(() => localStorage.clear());
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
});
