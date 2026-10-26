import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig(mode?: string) {
  vi.resetModules();
  if (mode === undefined) vi.stubEnv('PLAYWRIGHT_SERVER', undefined);
  else vi.stubEnv('PLAYWRIGHT_SERVER', mode);
  return (await import('../playwright.config')).default;
}

afterEach(() => vi.unstubAllEnvs());

describe('theme E2E real-index prerequisite', () => {
  it.each([undefined, 'dev'])(
    'builds a fresh isolated index before serving %s',
    async (mode) => {
      const config = await loadConfig(mode);
      const server = config.webServer;
      if (!server || Array.isArray(server))
        throw new Error('Expected one build-owned server');
      const [build, serve] = server.command.split(' && ');
      expect(build).toBe('pnpm build:ci --outDir ./.astro/e2e-dist');
      expect(serve).toBe(
        `pnpm exec astro ${mode ?? 'preview'} --outDir ./.astro/e2e-dist --host 127.0.0.1 --port 4332`,
      );
      expect(server.reuseExistingServer).toBe(false);
      expect(config.use?.baseURL).toBe('http://127.0.0.1:4332');
      expect(server.url).toBe('http://127.0.0.1:4332/blog');
    },
  );

  it('rejects unknown server modes instead of silently skipping the prerequisite', async () => {
    await expect(loadConfig('external')).rejects.toThrow(
      'PLAYWRIGHT_SERVER must be preview or dev',
    );
  });
});
