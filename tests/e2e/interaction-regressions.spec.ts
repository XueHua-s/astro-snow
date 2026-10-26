import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const INPUT = '#search-dialog-container .pagefind-ui__search-input';
const MESSAGE = '#search-dialog-container .pagefind-ui__message';
const MODULE = /\/pagefind\/pagefind\.js(?:\?.*)?$/;
const PANEL = /\/SearchDialogPanel(?:\.tsx|\.[^/]+\.js)(?:\?.*)?$/;

test.use({
  viewport: { width: 1440, height: 900 },
  contextOptions: { reducedMotion: 'reduce' },
});

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydration|hydrated|server rendered|#418/i.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  return () =>
    expect(errors, 'No app hydration or unhandled async errors').toEqual([]);
}

async function visit(page: Page) {
  await page.goto('/blog', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('astro-island:has(#site-header)'),
  ).not.toHaveAttribute('ssr');
}

async function open(page: Page) {
  await page.locator('#search-trigger').click();
  await expect(page.locator(INPUT)).toBeFocused();
}

async function search(page: Page) {
  await page.locator(INPUT).fill('react');
  await expect(page.locator(MESSAGE)).toHaveText(/\d+ 个结果/, {
    timeout: 15000,
  });
  await expect(page.locator('.pagefind-ui__result-link').first()).toBeVisible();
}

function delay(context: BrowserContext, pattern: RegExp) {
  let release = () => {};
  let requested = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const handler = async (route: import('@playwright/test').Route) => {
    requested = true;
    await gate;
    await route.continue().catch(() => {}); // Close/navigation may cancel this request.
  };
  return {
    install: () => context.route(pattern, handler),
    requested: () => requested,
    release,
    remove: () => context.unroute(pattern, handler),
  };
}

test('delayed panel hydration owns one working input and supports fast reopen', async ({
  page,
  context,
}) => {
  const clean = collectErrors(page);
  const panel = delay(context, PANEL);
  await panel.install();
  try {
    await visit(page);
    await page.locator('#search-trigger').click();
    await expect(page.locator('#search-trigger')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect.poll(panel.requested).toBe(true);
    await expect(
      page.locator('astro-island:has(#search-dialog)'),
    ).toHaveAttribute('ssr', '');
  } finally {
    panel.release();
  }
  await expect(page.locator(INPUT)).toBeFocused();
  await expect(page.locator(INPUT)).toHaveCount(1);
  await search(page);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.pagefind-ui__result').first()).toHaveAttribute(
    'data-selected',
    'true',
  );
  await page.locator(INPUT).fill('龘靐齉龘靐齉');
  await expect(page.locator(MESSAGE)).toHaveText('没有找到结果');
  await expect(page.locator('[data-selected="true"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.locator(INPUT)).toBeFocused();
  await expect(page.locator(INPUT)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-dialog')).toBeHidden();
  await expect(page.locator('#search-trigger')).toBeFocused();
  clean();
});

for (const fault of ['module', 'metadata', 'chunk', 'fragment'] as const) {
  test(`search ${fault} failure is visible, closeable and recovers through real reload`, async ({
    page,
    context,
  }) => {
    const clean = collectErrors(page);
    const pattern =
      fault === 'module'
        ? MODULE
        : fault === 'metadata'
          ? /\/pagefind-entry\.json(?:\?.*)?$/
          : fault === 'chunk'
            ? /\.pf_index$/
            : /\.pf_fragment$/;
    let failures = 0;
    const abort = async (route: import('@playwright/test').Route) => {
      failures++;
      await route.abort();
    };
    await context.route(pattern, abort);
    await visit(page);
    await open(page);
    await page.locator(INPUT).fill('react');
    await expect(page.getByRole('alert')).toContainText(
      /搜索(模块|索引)加载失败/,
      { timeout: 15000 },
    );
    expect(failures).toBeGreaterThan(0);
    await expect(page.locator('#search-reload')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#search-dialog')).toBeHidden();
    await expect(page.locator('#search-trigger')).toBeFocused();
    await context.unroute(pattern, abort);
    // A cached dynamic-import failure is NOT retried as if the old URL worked.
    await open(page);
    await expect(page.getByRole('alert')).toBeVisible();
    await Promise.all([
      page.waitForEvent('load'),
      page.locator('#search-reload').click(),
    ]);
    await expect(
      page.locator('astro-island:has(#site-header)'),
    ).not.toHaveAttribute('ssr');
    await open(page);
    await search(page);
    clean();
  });
}

for (const finish of ['close', 'reopen', 'navigate'] as const) {
  test(`delayed search module cleanup across ${finish} ignores obsolete work`, async ({
    page,
    context,
  }) => {
    const clean = collectErrors(page);
    const module = delay(context, MODULE);
    await module.install();
    try {
      await visit(page);
      await open(page);
      await page.locator(INPUT).fill('react');
      await expect.poll(module.requested).toBe(true);
      await page.keyboard.press('Escape');
      if (finish === 'reopen') await page.keyboard.press('ControlOrMeta+k');
      else {
        await expect(page.locator('#search-dialog')).toBeHidden();
        if (finish === 'navigate') {
          await page.evaluate(() => {
            (window as Window & { sameDocument?: boolean }).sameDocument = true;
          });
          await page.locator('#site-header a[href="/blog/friends"]').click();
          await expect(page).toHaveURL(/\/blog\/friends$/);
          expect(
            await page.evaluate(
              () =>
                (window as Window & { sameDocument?: boolean }).sameDocument,
            ),
          ).toBe(true);
        }
      }
    } finally {
      module.release();
      await module.remove();
    }
    if (finish !== 'reopen') await open(page);
    await expect(page.locator(INPUT)).toBeFocused();
    await expect(page.locator(INPUT)).toHaveCount(1);
    await search(page);
    clean();
  });
}

test('hover menu supports Enter/Space, link focus, Escape, transfer and scroll dismissal', async ({
  page,
}) => {
  const clean = collectErrors(page);
  await visit(page);
  const trigger = page
    .locator('#site-header')
    .getByRole('button', { name: '文章菜单' });
  const links = page.locator('.nav-dropdown a');
  await page.mouse.move(1400, 850);
  for (const key of ['Enter', 'Space']) {
    await trigger.focus();
    await page.keyboard.press(key);
    await expect(links.first()).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(links.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(links).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await trigger.hover();
  await links.first().hover();
  await expect(links.first()).toBeVisible();
  await page.evaluate(() =>
    window.scrollTo({ top: 1000, behavior: 'instant' }),
  );
  await expect(links).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('#site-header')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)',
  );
  await page.mouse.move(1400, 850);
  await trigger.hover();
  await expect(links.first()).toBeVisible();
  clean();
});

test('collapsed floating children are inert in forward and reverse tab traversal', async ({
  page,
}) => {
  await visit(page);
  const toggle = page.locator('#toggle-nav');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#nav-content')).toHaveAttribute('inert', '');
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement?.id)).not.toMatch(
    /^scroll-to-/,
  );
  await toggle.focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.id)).not.toMatch(
    /^scroll-to-/,
  );
  await toggle.click();
  await expect(page.locator('#nav-content')).not.toHaveAttribute('inert');
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#scroll-to-bottom')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#scroll-to-top')).toBeFocused();
});

test('initial null fullscreen subscriptions cannot release an already open search lock', async ({
  page,
  context,
}) => {
  const controllers = delay(
    context,
    /\/(?:code-fullscreen-controller\.ts|mermaid-fullscreen-controller\.ts|(?:CodeBlockFullscreen|MermaidFullscreen)\.astro_astro_type_script_index_0_lang\.[^/]+\.js)(?:\?.*)?$/,
  );
  await controllers.install();
  try {
    // A delayed module script blocks DOMContentLoaded, but unrelated islands
    // can hydrate and open search before these controller imports are released.
    await page.goto('/blog', { waitUntil: 'commit' });
    await expect(
      page.locator('astro-island:has(#site-header)'),
    ).not.toHaveAttribute('ssr');
    await open(page);
    await expect.poll(controllers.requested).toBe(true);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  } finally {
    controllers.release();
    await controllers.remove();
  }
  // Their initial null subscriptions used to schedule unmatched releases at 200ms.
  await page.waitForTimeout(350);
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(page.locator('#search-dialog')).toBeHidden();
  await expect
    .poll(() => page.locator('body').evaluate((body) => body.style.overflow))
    .toBe('');
});

for (const first of ['code', 'mermaid'] as const) {
  test(`fullscreen owners stay locked when ${first} closes first and on fast reopen`, async ({
    page,
  }) => {
    await visit(page);
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('open-code-fullscreen', {
          detail: {
            code: 'test',
            codeHTML: 'test',
            language: 'text',
            preClassName: '',
            preStyle: '',
            codeClassName: '',
          },
        }),
      );
      window.dispatchEvent(
        new CustomEvent('open-mermaid-fullscreen', {
          detail: { svg: '<svg></svg>', source: 'graph LR; A-->B' },
        }),
      );
    });
    const second = first === 'code' ? 'mermaid' : 'code';
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    // Programmatic button activation intentionally tests two independent overlays,
    // without letting the topmost backdrop prevent the other owner's close.
    await page
      .locator(`#${first}-fullscreen-close`)
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.locator(`#${first}-fullscreen-dialog`)).toHaveAttribute(
      'data-state',
      'closed',
    );
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page
      .locator(`#${second}-fullscreen-close`)
      .evaluate((button: HTMLButtonElement) => button.click());
    await page.evaluate(
      (kind) =>
        window.dispatchEvent(
          new CustomEvent(`open-${kind}-fullscreen`, {
            detail:
              kind === 'code'
                ? {
                    code: 'reopen',
                    codeHTML: 'reopen',
                    language: 'text',
                    preClassName: '',
                    preStyle: '',
                    codeClassName: '',
                  }
                : { svg: '<svg></svg>', source: 'graph LR' },
          }),
        ),
      second,
    );
    await page.waitForTimeout(300);
    await expect(page.locator(`#${second}-fullscreen-dialog`)).toHaveAttribute(
      'data-state',
      'open',
    );
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page
      .locator(`#${second}-fullscreen-close`)
      .evaluate((button: HTMLButtonElement) => button.click());
    await expect
      .poll(() => page.locator('body').evaluate((body) => body.style.overflow))
      .toBe('');
  });
}

test('real search supports clear, batched results and result-link SPA navigation', async ({
  page,
}) => {
  const clean = collectErrors(page);
  await visit(page);
  await open(page);
  await search(page);
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(5);
  await expect(
    page.locator('.pagefind-ui__result-excerpt mark').first(),
  ).toBeVisible();
  await page.getByRole('button', { name: '加载更多结果' }).click();
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(10);
  await page.getByRole('button', { name: '清空', exact: true }).click();
  await expect(page.locator(INPUT)).toHaveValue('');
  await expect(page.locator(INPUT)).toBeFocused();
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(0);
  await search(page);
  const result = page.locator('.pagefind-ui__result-link').first();
  const href = await result.getAttribute('href');
  expect(href).toBeTruthy();
  await page.evaluate(() => {
    (window as Window & { sameDocument?: boolean }).sameDocument = true;
  });
  await result.click();
  await expect(page).toHaveURL(href!);
  expect(
    await page.evaluate(
      () => (window as Window & { sameDocument?: boolean }).sameDocument,
    ),
  ).toBe(true);
  await expect(page.locator('#search-dialog')).toBeHidden();
  await open(page);
  await search(page);
  clean();
});

test('a hung Pagefind request times out instead of loading forever and closes cleanly', async ({
  page,
  context,
}) => {
  const clean = collectErrors(page);
  const module = delay(context, MODULE);
  await module.install();
  try {
    await visit(page);
    await page.clock.install();
    await open(page);
    await page.locator(INPUT).fill('react');
    await expect.poll(module.requested).toBe(true);
    await page.clock.fastForward(16000);
    await expect(page.getByRole('alert')).toContainText('加载失败');
    await expect(page.locator('#search-reload')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.clock.fastForward(300);
    await expect(page.locator('#search-dialog')).toBeHidden();
    await expect(page.locator('#search-trigger')).toBeFocused();
    clean();
  } finally {
    module.release();
    await module.remove();
  }
});

test('late fragments from an old query cannot replace a newer no-results state', async ({
  page,
  context,
}) => {
  const clean = collectErrors(page);
  const fragments = delay(context, /\.pf_fragment$/);
  await fragments.install();
  try {
    await visit(page);
    await open(page);
    await page.locator(INPUT).fill('react');
    await expect.poll(fragments.requested).toBe(true);
    await page.locator(INPUT).fill('龘靐齉龘靐齉');
    await expect(page.locator(MESSAGE)).toHaveText('没有找到结果');
  } finally {
    fragments.release();
    await fragments.remove();
  }
  await expect(page.locator(MESSAGE)).toHaveText('没有找到结果');
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(0);
  clean();
});

test.describe('wide-viewport touch hover-menu activation', () => {
  test.use({ hasTouch: true });
  test('tap opens the same links and outside tap dismisses them', async ({
    page,
  }) => {
    const clean = collectErrors(page);
    await visit(page);
    const trigger = page
      .locator('#site-header')
      .getByRole('button', { name: '文章菜单' });
    await trigger.tap();
    await expect(page.locator('.nav-dropdown a').first()).toBeVisible();
    await page.getByRole('heading', { name: '雪花の博客', exact: true }).tap();
    await expect(page.locator('.nav-dropdown a')).toHaveCount(0);
    clean();
  });
});

for (const activation of ['keyboard', 'pointer'] as const) {
  test(`incremental ${activation} pagination retains nodes, scroll and focus through the final page`, async ({
    page,
    context,
  }) => {
    const clean = collectErrors(page);
    await visit(page);
    await open(page);
    await search(page);
    const list = page.locator('.pagefind-ui__results');
    const results = page.locator('.pagefind-ui__result');
    const more = page.getByRole('button', { name: '加载更多结果' });
    const scroller = page.locator(
      '#search-dialog-content .scroll-feather-mask',
    );
    const total = Number.parseInt(await page.locator(MESSAGE).innerText(), 10);
    expect(total).toBeGreaterThan(15);
    await more.click();
    await expect(results).toHaveCount(10);

    const extend = async (count: number, nextCount: number) => {
      const fragments = delay(context, /\.pf_fragment$/);
      await fragments.install();
      const before = await list.evaluateHandle((element) => ({
        list: element,
        children: [...element.children],
      }));
      const button = await more.elementHandle();
      await more.scrollIntoViewIfNeeded();
      await more.focus();
      const scrollTop = await scroller.evaluate((element) => element.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
      try {
        if (activation === 'keyboard') await page.keyboard.press('Enter');
        else await more.click();
        await expect.poll(fragments.requested).toBe(true);
        await expect(results).toHaveCount(count);
        expect(
          await list.evaluate(
            (element, previous) =>
              element === previous.list &&
              previous.children.every(
                (child, index) =>
                  element.children[index] === child && child.isConnected,
              ),
            before,
          ),
        ).toBe(true);
        expect(
          await more.evaluate(
            (element, previous) => element === previous,
            button,
          ),
        ).toBe(true);
        await expect(more).toBeFocused();
        expect(
          await scroller.evaluate((element) => element.scrollTop),
        ).toBeCloseTo(scrollTop, 0);
      } finally {
        fragments.release();
        await fragments.remove();
      }
      await expect(results).toHaveCount(nextCount);
      expect(
        await list.evaluate(
          (element, previous) =>
            element === previous.list &&
            previous.children.every(
              (child, index) =>
                element.children[index] === child && child.isConnected,
            ),
          before,
        ),
      ).toBe(true);
      expect(
        await scroller.evaluate((element) => element.scrollTop),
      ).toBeCloseTo(scrollTop, 0);
      if (nextCount < total) {
        expect(
          await more.evaluate(
            (element, previous) => element === previous,
            button,
          ),
        ).toBe(true);
        await expect(more).toBeFocused();
      } else {
        await expect(more).toHaveCount(0);
        await expect(
          page.locator('.pagefind-ui__result-link').nth(count),
        ).toBeFocused();
      }
      await before.dispose();
      await button?.dispose();
    };

    await extend(10, 15);
    let count = 15;
    while (total - count > 5) {
      await more.click();
      count += 5;
      await expect(results).toHaveCount(count);
    }
    await extend(count, total);
    await expect(page.getByRole('alert')).toHaveCount(0);
    clean();
  });
}

for (const failure of ['abort', 'http500'] as const) {
  test(`obsolete ${failure} fragments cannot poison a newer successful query or its next search`, async ({
    page,
    context,
  }) => {
    const clean = collectErrors(page);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requested = 0;
    let completed = 0;
    const handler = async (route: import('@playwright/test').Route) => {
      requested++;
      await gate;
      try {
        if (failure === 'abort') await route.abort();
        else
          await route.fulfill({
            status: 500,
            body: 'Obsolete fragment failed',
          });
      } catch {
        // A query-owned worker may already have cancelled its old real request.
      } finally {
        completed++;
      }
    };
    await context.route(/\.pf_fragment$/, handler);
    try {
      await visit(page);
      await open(page);
      await page.locator(INPUT).fill('react');
      await expect.poll(() => requested).toBeGreaterThan(0);
      await page.locator(INPUT).fill('龘靐齉龘靐齉');
      await expect(page.locator(MESSAGE)).toHaveText('没有找到结果');
      release();
      await expect.poll(() => completed).toBe(requested);
      await page.waitForTimeout(300); // Allow the deliberately late failures to be delivered.
      await expect(page.locator(MESSAGE)).toHaveText('没有找到结果');
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('#search-reload')).toHaveCount(0);
    } finally {
      release();
      await context.unroute(/\.pf_fragment$/, handler);
    }
    await page.locator(INPUT).fill('astro');
    await expect(page.locator(MESSAGE)).toHaveText(/\d+ 个结果/, {
      timeout: 15000,
    });
    await expect(
      page.locator('.pagefind-ui__result-link').first(),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    clean();
  });
}

test('empty and rapid edits create no engine until one normalized query settles', async ({
  page,
  context,
}) => {
  const clean = collectErrors(page);
  await page.addInitScript(() => {
    const state = window as Window & {
      queryWorkers?: { terminated: boolean }[];
    };
    state.queryWorkers = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes('pagefind.worker')) return;
        const entry = { terminated: false };
        state.queryWorkers?.push(entry);
        const stop = this.terminate.bind(this);
        this.terminate = () => {
          entry.terminated = true;
          stop();
        };
      }
    };
  });
  let modules = 0;
  await context.route(MODULE, async (route) => {
    modules++;
    await route.continue();
  });
  const engines = () =>
    page.evaluate(
      () =>
        (window as Window & { queryWorkers?: { terminated: boolean }[] })
          .queryWorkers ?? [],
    );
  await visit(page);
  await open(page);
  await page.clock.install({ time: new Date(0) });
  await page.clock.pauseAt(new Date(1000));
  await page.clock.fastForward(1000);
  expect(await engines()).toHaveLength(0);
  expect(modules).toBe(0);

  for (const value of ['r', 're', 'rea', 'reac']) {
    await page.locator(INPUT).fill(value);
    await page.clock.fastForward(100);
    expect(await engines()).toHaveLength(0);
  }
  await page.locator(INPUT).fill('react');
  await page.clock.fastForward(299);
  expect(await engines()).toHaveLength(0);
  await page.clock.fastForward(1);
  await expect(page.locator(MESSAGE)).toHaveText(/\d+ 个结果/, {
    timeout: 15000,
  });
  expect(await engines()).toHaveLength(1);
  expect(modules).toBe(1);

  await page.locator(INPUT).fill('  react  ');
  await page.clock.fastForward(1000);
  await page.getByRole('button', { name: '加载更多结果' }).click();
  await page.clock.fastForward(1);
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(10);
  expect(await engines()).toHaveLength(1);
  expect(modules).toBe(1);

  await page.locator(INPUT).fill('');
  await page.clock.fastForward(1000);
  expect(await engines()).toEqual([{ terminated: true }]);
  await expect(page.locator('.pagefind-ui__result')).toHaveCount(0);
  await page.locator(INPUT).fill('astro');
  await page.clock.fastForward(150);
  await page.locator(INPUT).fill('');
  await page.clock.fastForward(1000);
  expect(await engines()).toEqual([{ terminated: true }]);
  expect(modules).toBe(1);

  await page.locator(INPUT).fill('typescript');
  await page.clock.fastForward(300);
  await expect(page.locator(MESSAGE)).toHaveText(/\d+ 个结果/, {
    timeout: 15000,
  });
  expect(await engines()).toHaveLength(2);
  expect(modules).toBe(2);
  await page.keyboard.press('Escape');
  await page.clock.fastForward(300);
  await expect(page.locator('#search-dialog')).toBeHidden();
  expect(await engines()).toEqual([{ terminated: true }, { terminated: true }]);
  clean();
});
