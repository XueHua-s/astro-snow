import { expect, type Page } from '@playwright/test';

const NOISY_CONSOLE_PATTERNS = [
  /Failed to load resource/i,
  /giscus/i,
  /cdn\.jsdelivr\.net/i,
  /Error while running audit's match function: TypeError: Failed to fetch/i,
  /pagefind\/pagefind\.js/i, // pagefind index unavailable in dev mode
];

/** Known page errors from third-party libraries in dev mode */
const KNOWN_PAGE_ERROR_PATTERNS = [
  /Cannot read properties of undefined \(reading 'options'\)/i, // pagefind dev mode
];

export function setupRuntimeErrorCollector(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => {
    const isKnown = KNOWN_PAGE_ERROR_PATTERNS.some((pattern) =>
      pattern.test(error.message),
    );
    if (!isKnown) {
      pageErrors.push(error.message);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const isNoise = NOISY_CONSOLE_PATTERNS.some((pattern) =>
      pattern.test(text),
    );
    if (!isNoise) {
      consoleErrors.push(text);
    }
  });

  return {
    assertClean: () => {
      expect(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toEqual([]);
      expect(
        consoleErrors,
        `console errors:\n${consoleErrors.join('\n')}`,
      ).toEqual([]);
    },
  };
}
