import { defineConfig, devices } from '@playwright/test';

// FIXED: Real-search tests need a fresh Pagefind index, including when invoked
// with `pnpm exec playwright test` (not only the package script). Never reuse a
// dev server whose ignored dist/pagefind may be missing or stale. Both modes
// build into a private output directory, leaving normal dev/preview untouched.
// pnpm test:e2e                       -> build + production preview
// PLAYWRIGHT_SERVER=dev pnpm test:e2e -> build + real dev module delivery
const serverMode = process.env.PLAYWRIGHT_SERVER ?? 'preview';
if (!['preview', 'dev'].includes(serverMode))
  throw new Error('PLAYWRIGHT_SERVER must be preview or dev');
const outDir = './.astro/e2e-dist';
const origin = 'http://127.0.0.1:4332';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm build:ci --outDir ${outDir} && pnpm exec astro ${serverMode} --outDir ${outDir} --host 127.0.0.1 --port 4332`,
    url: `${origin}/blog`,
    reuseExistingServer: false,
    timeout: 300000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
