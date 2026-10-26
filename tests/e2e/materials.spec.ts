import { expect, test, type Locator, type Page } from '@playwright/test';
import { setupRuntimeErrorCollector } from './helpers/runtime-errors';

type MaterialMode = 'normal' | 'transparency' | 'contrast' | 'forced';

async function emulateMaterial(page: Page, mode: MaterialMode) {
  // Playwright does not expose reduced-transparency; CDP applies the real MQ.
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [
      {
        name: 'prefers-reduced-transparency',
        value: mode === 'transparency' ? 'reduce' : 'no-preference',
      },
      {
        name: 'prefers-contrast',
        value: mode === 'contrast' ? 'more' : 'no-preference',
      },
      { name: 'forced-colors', value: mode === 'forced' ? 'active' : 'none' },
    ],
  });
}

async function setTheme(page: Page, dark: boolean) {
  await page.evaluate((enabled) => {
    document.documentElement.classList.toggle('dark', enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
    localStorage.setItem('theme', enabled ? 'dark' : 'light');
  }, dark);
}

async function openBlog(page: Page) {
  await page.goto('/blog', { waitUntil: 'domcontentloaded' });
  await expect
    .poll(() =>
      page
        .locator('#site-header')
        .evaluate(
          (element) => !element.closest('astro-island')?.hasAttribute('ssr'),
        ),
    )
    .toBe(true);
}

async function finishAnimations(locator: Locator) {
  await locator.evaluate(async (element) => {
    // Direction changes legitimately cancel an in-flight CSS transition.
    await Promise.allSettled(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
}

async function scrollHeader(page: Page) {
  const header = page.locator('#site-header');
  // Production navigation appears on upward scrolling, not the initial descent.
  await page.evaluate(() =>
    window.scrollTo({ top: 1000, behavior: 'instant' }),
  );
  if ((page.viewportSize()?.width ?? 1440) > 992) {
    await expect
      .poll(() =>
        header.evaluate((element) => element.getBoundingClientRect().bottom),
      )
      .toBeLessThanOrEqual(0);
  } else {
    await expect(header).toHaveClass(/with-background/);
  }
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
  await expect(header).toHaveClass(/with-background/);
  await expect
    .poll(() =>
      header.evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeGreaterThanOrEqual(0);
  await finishAnimations(header);
  await finishAnimations(page.locator('.site-header-bg'));
}

async function resetHeader(page: Page) {
  // Enter the existing near-top threshold before reaching scrollY=0.
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }));
  await expect(page.locator('#site-header')).not.toHaveClass(/with-background/);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await finishAnimations(page.locator('.site-header-bg'));
}

// Resolve CSS colors through the browser, including alpha, and composite over
// both extremes. For translucent material this is stricter than a single image.
// More tabs are opaque: this measures their actual resolved ink/surface pair.
async function minimumContrast(locator: Locator) {
  return locator.evaluate((element) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Color resolver unavailable');
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const luminance = (rgb: number[]) =>
      rgb.slice(0, 3).reduce((sum, value, index) => {
        const channel = value / 255;
        return (
          sum +
          (channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][index]
        );
      }, 0);
    const composite = (color: number[], base: number[]) =>
      color
        .slice(0, 3)
        .map(
          (value, index) =>
            (value * color[3]) / 255 + base[index] * (1 - color[3] / 255),
        );
    const style = getComputedStyle(element);
    if (style.backgroundImage !== 'none')
      throw new Error('Gradient contrast needs explicit sampling');
    const background = rgba(style.backgroundColor);
    const ink = rgba(style.color);
    return Math.min(
      ...[0, 255].map((extreme) => {
        const surface = composite(background, [extreme, extreme, extreme]);
        const a = luminance(surface);
        const b = luminance(composite(ink, surface));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }),
    );
  });
}

for (const width of [1440, 390]) {
  for (const mode of [
    'normal',
    'transparency',
    'contrast',
    'forced',
  ] as const) {
    test(`${width}px ${mode}: material roles, header fallback, ink and scrims`, async ({
      page,
    }) => {
      const runtime = setupRuntimeErrorCollector(page);
      await page.setViewportSize({ width, height: 900 });
      await emulateMaterial(page, mode);
      await openBlog(page);
      for (const dark of [false, true]) {
        await setTheme(page, dark);
        await resetHeader(page);
        await expect(page.locator('#site-header')).not.toHaveClass(
          /with-background/,
        );
        await finishAnimations(page.locator('.site-header-bg'));
        await expect(page.locator('.site-header-bg')).toHaveCSS('opacity', '0');
        await expect(page.locator('.site-header-bg')).toHaveCSS(
          'backdrop-filter',
          'none',
        );
        const readingSurfaces = page.locator('.glass-panel, .glass-card');
        expect(await readingSurfaces.count()).toBeGreaterThan(1);
        for (const surface of await readingSurfaces.all()) {
          await expect(surface).toHaveCSS('backdrop-filter', 'none');
          await expect(surface).toHaveCSS('background-image', 'none');
        }
        const tabs = page.locator('a[aria-label="more info"] button');
        expect(await tabs.count()).toBeGreaterThan(1);
        for (const tab of await tabs.all()) {
          expect(await minimumContrast(tab)).toBeGreaterThanOrEqual(4.5);
        }
        await scrollHeader(page);
        const headerBackground = page.locator('.site-header-bg');
        if (mode === 'normal') {
          await expect(headerBackground).toHaveCSS('backdrop-filter', /blur\(/);
          await expect(page.locator('#floating-nav > .glass')).toHaveCSS(
            'backdrop-filter',
            /blur\(/,
          );
        } else {
          await expect(headerBackground).toHaveCSS('backdrop-filter', 'none');
          await expect(headerBackground).toHaveCSS('background-image', 'none');
          for (const material of await page
            .locator('.glass, .glass-scrim')
            .all()) {
            await expect(material).toHaveCSS('backdrop-filter', 'none');
          }
        }
        if (mode !== 'forced') {
          const ink = await page.locator('#site-header').evaluate((element) => {
            const expected = document.createElement('span');
            expected.style.color = 'hsl(var(--foreground))';
            element.appendChild(expected);
            const value = getComputedStyle(expected).color;
            expected.remove();
            return value;
          });
          await expect(page.locator('#search-trigger')).toHaveCSS('color', ink);
          expect(
            await minimumContrast(page.locator('#floating-nav > .glass')),
          ).toBeGreaterThanOrEqual(4.5);
        }
        if (width === 1440) {
          await page.locator('[data-header-route-group]').first().hover();
          const menu = page.locator('.glass-menu');
          await expect(menu).toBeVisible();
          if (mode !== 'forced')
            expect(await minimumContrast(menu)).toBeGreaterThanOrEqual(4.5);
          await expect(menu.locator('a').first()).toHaveCSS(
            'color',
            await menu.evaluate((element) => getComputedStyle(element).color),
          );
          await page.mouse.move(0, 800);
          await expect(menu).toBeHidden();
        }
        await page.locator('#search-trigger').click();
        await expect(page.locator('#search-dialog')).toBeVisible();
        await expect(
          page.locator('#search-dialog-container .pagefind-ui__search-input'),
        ).toBeFocused();
        await expect(page.locator('#floating-nav')).toHaveCSS('opacity', '0');
        await expect(page.locator('#floating-nav')).toHaveCSS(
          'pointer-events',
          'none',
        );
        await expect(page.locator('#search-overlay')).toHaveCSS(
          'backdrop-filter',
          mode === 'normal' ? /blur\(/ : 'none',
        );
        await page.keyboard.press('Escape');
        await expect(page.locator('#search-dialog')).toBeHidden();
        await expect(page.locator('#search-trigger')).toBeFocused();
        await expect(page.locator('#search-trigger')).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      }
      if (width === 390) {
        await page.goto('/blog/post/38', { waitUntil: 'domcontentloaded' });
        const heading = page.locator('article h2[id]').first();
        await heading.scrollIntoViewIfNeeded();
        await heading.evaluate((element) =>
          element.scrollIntoView({ block: 'start', behavior: 'instant' }),
        );
        await page.evaluate(() =>
          window.scrollBy({ top: 150, behavior: 'instant' }),
        );
        const trigger = page.locator('button[aria-label="展开目录"]');
        await expect(trigger).toBeVisible();
        for (const dark of [false, true]) {
          await setTheme(page, dark);
          if (mode !== 'forced')
            expect(await minimumContrast(trigger)).toBeGreaterThanOrEqual(4.5);
          if (mode !== 'normal')
            await expect(trigger).toHaveCSS('backdrop-filter', 'none');
        }
      }
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      for (const dark of [false, true]) {
        await setTheme(page, dark);
        const hero = page.locator('[data-glass-hero]');
        await expect(hero).toHaveCSS(
          'backdrop-filter',
          mode === 'normal' ? /blur\(|url\(/ : 'none',
        );
        for (const link of await hero.locator('a').all()) {
          expect(await minimumContrast(link)).toBeGreaterThanOrEqual(4.5);
        }
      }
      runtime.assertClean();
    });
  }
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`keyboard category reveal without hover, ${reducedMotion}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await openBlog(page);
    const flip = page.locator('.flip-card').first();
    await flip.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    expect(await flip.evaluate((element) => element.matches(':hover'))).toBe(
      false,
    );
    const firstLink = flip.locator('.flip-card-back a').first();
    // Start one tab stop before the back-face links, then enter using Tab.
    await page.evaluate(() => {
      const marker = document.createElement('button');
      document.querySelector('.flip-card')?.before(marker);
      marker.focus();
      marker.addEventListener('blur', () => marker.remove(), { once: true });
    });
    await page.keyboard.press('Tab');
    await expect(firstLink).toBeFocused();
    await finishAnimations(flip.locator('.flip-card-inner'));
    await expect(flip.locator('.flip-card-inner')).toHaveCSS(
      'transform',
      /matrix3d\(-1/,
    );
    expect(
      await firstLink.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
        );
        return element === hit || element.contains(hit);
      }),
    ).toBe(true);
    await page.keyboard.press('Tab');
    await expect(flip).toHaveCSS('perspective', '1000px');
    expect(
      await flip.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    if (reducedMotion === 'reduce') {
      await expect(flip.locator('.flip-card-inner')).toHaveCSS(
        'transition-duration',
        '0s',
      );
      await firstLink.hover();
      await expect(firstLink).toHaveCSS('animation-name', 'none');
      await expect(firstLink).toHaveCSS('transition-duration', '0s');
      const cover = page.locator('.glass-interactive img').first();
      await cover.hover();
      await expect(cover).toHaveCSS('transform', 'none');
      await expect(cover).toHaveCSS('transition-duration', '0s');
      await page.evaluate(() => {
        const original = window.scrollTo.bind(window);
        window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
          if (typeof options === 'object')
            document.documentElement.dataset.scrollBehavior = options.behavior;
          if (typeof options === 'number') original(options, y ?? 0);
          else original(options);
        };
      });
      await page.locator('#scroll-to-top').click();
      await expect(page.locator('html')).toHaveAttribute(
        'data-scroll-behavior',
        'instant',
      );
      await page.locator('#scroll-to-bottom').click();
      await expect(page.locator('html')).toHaveAttribute(
        'data-scroll-behavior',
        'instant',
      );
      await page.goto('/');
      await page.locator('[data-glass-hero] img').hover();
      await expect(page.locator('[data-glass-hero] img')).toHaveCSS(
        'transform',
        'none',
      );
    }
  });
}

test('theme-transition suppresses filters and restores baseline/refraction', async ({
  page,
}) => {
  await openBlog(page);
  await scrollHeader(page);
  const selectors = [
    '.site-header-bg',
    '#floating-nav > .glass',
    '#search-overlay',
    '#code-fullscreen-overlay',
    '#mermaid-fullscreen-overlay',
  ];
  const before = await Promise.all(
    selectors.map((selector) =>
      page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).backdropFilter),
    ),
  );
  await page.evaluate(() =>
    document.documentElement.classList.add('theme-transition'),
  );
  for (const selector of selectors)
    await expect(page.locator(selector)).toHaveCSS('backdrop-filter', 'none');
  await page.evaluate(() =>
    document.documentElement.classList.remove('theme-transition'),
  );
  for (const [index, selector] of selectors.entries())
    await expect(page.locator(selector)).toHaveCSS(
      'backdrop-filter',
      before[index],
    );
  await page.goto('/');
  const hero = page.locator('[data-glass-hero]');
  await page.evaluate(() =>
    document.documentElement.classList.remove('glass-refract-supported'),
  );
  await expect(hero).toHaveCSS('backdrop-filter', /blur\(/);
  await page.evaluate(() =>
    document.documentElement.classList.add(
      'glass-refract-supported',
      'theme-transition',
    ),
  );
  await expect(hero).toHaveCSS('backdrop-filter', 'none');
  await page.evaluate(() =>
    document.documentElement.classList.remove('theme-transition'),
  );
  await expect(hero).toHaveCSS('backdrop-filter', /url\(/);
});

for (const mode of ['normal', 'transparency', 'contrast', 'forced'] as const) {
  test(`active fullscreen scrims respect ${mode} material mode`, async ({
    page,
  }) => {
    await emulateMaterial(page, mode);
    await openBlog(page);
    // Exercise materials after real navigation has settled, not during the
    // controllers' initial closed phase before any toolbar interaction.
    await scrollHeader(page);
    // Exercise the same production events dispatched by the toolbar buttons.
    for (const kind of ['code', 'mermaid'] as const) {
      await page.evaluate((type) => {
        window.dispatchEvent(
          new CustomEvent(`open-${type}-fullscreen`, {
            detail:
              type === 'code'
                ? {
                    language: 'text',
                    code: 'material fallback',
                    codeHTML: 'material fallback',
                    codeClassName: '',
                    preClassName: '',
                    preStyle: '',
                  }
                : {
                    source: 'graph LR; A-->B',
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="4" y="20">Material</text></svg>',
                  },
          }),
        );
      }, kind);
      await expect(page.locator(`#${kind}-fullscreen-dialog`)).toBeVisible();
      await expect(page.locator(`#${kind}-fullscreen-overlay`)).toBeVisible();
      await expect(page.locator(`#${kind}-fullscreen-overlay`)).toHaveCSS(
        'backdrop-filter',
        mode === 'normal' ? /blur\(/ : 'none',
      );
      await expect(page.locator(`#${kind}-fullscreen-content`)).toHaveCSS(
        'backdrop-filter',
        mode === 'normal' ? /blur\(/ : 'none',
      );
      await page.keyboard.press('Escape');
      await expect(page.locator(`#${kind}-fullscreen-dialog`)).toBeHidden();
    }
  });
}

async function paintedEdgeEnergy(page: Page) {
  const width = Math.min((page.viewportSize()?.width ?? 1440) - 32, 800);
  const capture = await page.screenshot({
    clip: { x: 16, y: 12, width, height: 24 },
  });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Paint sampler unavailable');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let energy = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 1; x < image.width; x++) {
        const index = (y * image.width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          energy +=
            Math.abs(pixels[index + channel] - pixels[index - 4 + channel]) / 3;
        }
      }
    }
    return energy / ((image.width - 1) * image.height);
  }, capture.toString('base64'));
}

for (const width of [1440, 390]) {
  for (const dark of [false, true]) {
    test(`header paints actual diffusion over stripes at ${width}px ${dark ? 'dark' : 'light'}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await openBlog(page);
      await setTheme(page, dark);
      await scrollHeader(page);
      await page.evaluate(() => {
        const header = document.getElementById('site-header');
        const foreground =
          header?.querySelector<HTMLElement>(':scope > .relative');
        if (!header || !foreground) throw new Error('Header chrome missing');
        // Hide only foreground ink, never the filter or its ancestry. This leaves
        // a deterministic unobstructed sampling area over high-frequency stripes.
        foreground.style.opacity = '0';
        const stripes = document.createElement('div');
        stripes.id = 'material-paint-stripes';
        Object.assign(stripes.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          height: `${header.getBoundingClientRect().height}px`,
          zIndex: '9',
          background:
            'repeating-linear-gradient(90deg, #000 0px 2px, #fff 2px 4px)',
          pointerEvents: 'none',
        });
        document.body.appendChild(stripes);
      });
      await finishAnimations(page.locator('#site-header'));
      await finishAnimations(page.locator('.site-header-bg'));
      const diffused = await paintedEdgeEnergy(page);
      await page.locator('.site-header-bg').evaluate((element) => {
        const surface = element as HTMLElement;
        surface.style.setProperty('backdrop-filter', 'none', 'important');
        surface.style.setProperty(
          '-webkit-backdrop-filter',
          'none',
          'important',
        );
      });
      const unfiltered = await paintedEdgeEnergy(page);
      await test.info().attach('header-paint-energy', {
        body: JSON.stringify({
          diffused,
          unfiltered,
          ratio: diffused / unfiltered,
        }),
        contentType: 'application/json',
      });
      expect(
        unfiltered,
        'Stripe fixture must retain visible edges without the filter',
      ).toBeGreaterThan(10);
      expect(
        diffused,
        'A computed blur is insufficient: painted edge energy must fall',
      ).toBeLessThan(unfiltered * 0.2);
      await page.locator('.site-header-bg').evaluate((element) => {
        const surface = element as HTMLElement;
        surface.style.removeProperty('backdrop-filter');
        surface.style.removeProperty('-webkit-backdrop-filter');
        document.getElementById('material-paint-stripes')?.remove();
        const foreground = document.querySelector<HTMLElement>(
          '#site-header > .relative',
        );
        if (foreground) foreground.style.removeProperty('opacity');
      });
    });
  }
}

for (const width of [1440, 390]) {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    test(`floating capsule yields to search and preserves collapse at ${width}px ${reducedMotion}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion });
      await openBlog(page);
      const nav = page.locator('#floating-nav');
      const capsule = page.locator('#floating-nav > .glass');
      const content = page.locator('#nav-content');
      await expect
        .poll(() =>
          nav.evaluate(
            (element) => !element.closest('astro-island')?.hasAttribute('ssr'),
          ),
        )
        .toBe(true);
      const expandedHeight = await capsule.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      await page.locator('#toggle-nav').click();
      await expect(nav).toHaveAttribute('data-expanded', 'false');
      await expect(content).toHaveCSS('max-height', '0px');
      const collapsedHeight = await capsule.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      expect(collapsedHeight).toBeLessThan(70);
      expect(expandedHeight - collapsedHeight).toBeGreaterThanOrEqual(30);
      if (reducedMotion === 'reduce') {
        for (const control of [
          nav,
          content,
          ...(await nav.locator('button, i').all()),
        ]) {
          await expect(control).toHaveCSS('transition-duration', '0s');
          await expect(control).toHaveCSS('animation-name', 'none');
        }
      }
      for (const dark of [false, true]) {
        await setTheme(page, dark);
        await page.locator('#search-trigger').click();
        await expect(page.locator('#search-dialog')).toBeVisible();
        await expect(
          page.locator('#search-dialog-container .pagefind-ui__search-input'),
        ).toBeFocused();
        await expect(nav).toHaveCSS('opacity', '0');
        await expect(nav).toHaveCSS('pointer-events', 'none');
        await expect(nav).toHaveAttribute('inert', '');
        await expect(nav).toHaveAttribute('aria-hidden', 'true');
        await page.keyboard.press('Escape');
        await expect(page.locator('#search-dialog')).toBeHidden();
        await expect(nav).toHaveCSS('opacity', '1');
        await expect(nav).toHaveCSS('transform', 'none');
        await expect(nav).not.toHaveAttribute('inert');
        await expect(nav).toHaveAttribute('data-expanded', 'false');
        expect(
          await capsule.evaluate(
            (element) => element.getBoundingClientRect().height,
          ),
        ).toBeCloseTo(collapsedHeight, 1);
      }
      if (width === 390) {
        await page
          .getByRole('button', { name: '打开菜单', exact: true })
          .click();
        await expect(page.locator('#drawer-overlay')).toBeVisible();
        await expect(nav).toHaveCSS('opacity', '0');
        await expect(nav).toHaveAttribute('inert', '');
        if (reducedMotion === 'reduce')
          await expect(nav).toHaveCSS('transition-duration', '0s');
        await page
          .getByRole('button', { name: '关闭菜单', exact: true })
          .first()
          .click();
        await expect(page.locator('#drawer-overlay')).toBeHidden();
        await expect(nav).toHaveCSS('opacity', '1');
        await expect(nav).toHaveCSS('transform', 'none');
        await expect(nav).toHaveAttribute('data-expanded', 'false');
      }
      await page.locator('#toggle-nav').click();
      await expect(nav).toHaveAttribute('data-expanded', 'true');
      await expect(content).toHaveCSS('opacity', '1');
      expect(
        await capsule.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBeCloseTo(expandedHeight, 1);
    });
  }
}

for (const initiallyOpen of ['search', 'drawer'] as const) {
  test(`delayed floating hydration isolates an already open ${initiallyOpen}`, async ({
    page,
  }) => {
    const runtime = setupRuntimeErrorCollector(page);
    const hydrationWarnings: string[] = [];
    page.on('console', (message) => {
      if (
        ['warning', 'error'].includes(message.type()) &&
        /hydrat|server rendered HTML|react\.dev\/errors\/418/i.test(
          message.text(),
        )
      )
        hydrationWarnings.push(message.text());
    });
    await page.setViewportSize({
      width: initiallyOpen === 'search' ? 1440 : 390,
      height: 900,
    });
    let releaseFloating = () => {};
    let sawFloatingRequest = false;
    const hydrationGate = new Promise<void>((resolve) => {
      releaseFloating = resolve;
    });
    // Hold only the real idle island module. Header, search, drawer and their
    // store interactions remain real; do not set DOM or store state in the test.
    await page.route(
      /\/FloatingGroup(?:\.tsx|\.[^/]+\.js)(?:\?.*)?$/,
      async (route) => {
        sawFloatingRequest = true;
        await hydrationGate;
        await route.continue();
      },
    );
    const nav = page.locator('#floating-nav');
    const capsule = page.locator('#floating-nav > .glass');
    const island = page.locator('astro-island:has(#floating-nav)');
    const input = page.locator(
      '#search-dialog-container .pagefind-ui__search-input',
    );
    const openOverlay = async (fromFloating = false) => {
      if (initiallyOpen === 'search') {
        if (fromFloating) await page.keyboard.press('ControlOrMeta+k');
        else await page.locator('#search-trigger').click();
        await expect(page.locator('#search-dialog')).toBeVisible();
        await expect(input).toBeFocused();
      } else {
        if (fromFloating) {
          // Keyboard traversal can scroll the background and hide this header.
          // Restore it through the real scroll behavior before clicking again.
          await scrollHeader(page);
          await resetHeader(page);
        }
        await page
          .getByRole('button', { name: '打开菜单', exact: true })
          .click();
        await expect(page.locator('#drawer-overlay')).toBeVisible();
        await expect(page.locator('#close-drawer button')).toBeFocused();
      }
    };
    const closeOverlay = async () => {
      await page.keyboard.press('Escape');
      await expect(
        page.locator(
          initiallyOpen === 'search' ? '#search-dialog' : '#drawer-overlay',
        ),
      ).toBeHidden();
      await expect(nav).toHaveCSS('opacity', '1');
      await expect(nav).toHaveCSS('visibility', 'visible');
      await expect(nav).toHaveCSS('transform', 'none');
      await expect(nav).not.toHaveAttribute('inert');
      await expect(nav).not.toHaveAttribute('aria-hidden');
    };
    let expandedHeight = 0;
    try {
      await openBlog(page);
      await expect(island).toHaveAttribute('ssr', '');
      expandedHeight = await capsule.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      await openOverlay();
      if (initiallyOpen === 'search') {
        await input.fill('react');
        await expect(
          page.locator('#search-dialog-container .pagefind-ui__message'),
        ).toHaveText(/\d+ 个结果/, { timeout: 15000 });
        await expect(input).toBeFocused();
      }
      await expect.poll(() => sawFloatingRequest).toBe(true);
      await expect(island).toHaveAttribute('ssr', '');
      // Isolation must already work while SSR markup is still waiting for JS.
      await expect(nav).toBeHidden();
      await expect(nav).toHaveCSS('visibility', 'hidden');
      await expect(nav).toHaveCSS('opacity', '0');
      await expect(nav).toHaveCSS('pointer-events', 'none');
      for (let index = 0; index < 3; index++) {
        await page.keyboard.press('Shift+Tab');
        expect(
          await nav.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(false);
      }
      if (initiallyOpen === 'search') {
        await input.click();
        await expect(input).toBeFocused();
      }
      await expect(island).toHaveAttribute('ssr', '');
    } finally {
      releaseFloating();
    }
    await expect(island).not.toHaveAttribute('ssr');
    await expect(nav).toHaveCSS('opacity', '0');
    await expect(nav).toHaveCSS('pointer-events', 'none');
    await expect(nav).toHaveAttribute('inert', '');
    await expect(nav).toHaveAttribute('aria-hidden', 'true');
    await closeOverlay();
    await page.locator('#toggle-nav').click();
    await expect(nav).toHaveAttribute('data-expanded', 'false');
    await expect(page.locator('#nav-content')).toHaveCSS('max-height', '0px');
    const collapsedHeight = await capsule.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(collapsedHeight).toBeLessThan(70);
    expect(expandedHeight - collapsedHeight).toBeGreaterThanOrEqual(30);
    // The search shortcut must still restore focus to the floating opener.
    await openOverlay(true);
    await expect(nav).toHaveCSS('opacity', '0');
    await expect(nav).toHaveAttribute('inert', '');
    await closeOverlay();
    if (initiallyOpen === 'search')
      await expect(page.locator('#toggle-nav')).toBeFocused();
    await expect(nav).toHaveAttribute('data-expanded', 'false');
    expect(
      await capsule.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeCloseTo(collapsedHeight, 1);
    await page.locator('#toggle-nav').click();
    await expect(nav).toHaveAttribute('data-expanded', 'true');
    await expect(page.locator('#nav-content')).toHaveCSS('opacity', '1');
    expect(
      await capsule.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeCloseTo(expandedHeight, 1);
    expect(hydrationWarnings).toEqual([]);
    runtime.assertClean();
  });
}
