import { once } from 'node:events';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOGData } from '../src/lib/markdown/remark-link-embed/fetch-og';

const URL = 'https://example.com/post';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Open Graph fetch', () => {
  it('aborts a stalled body even after the response headers arrive', async () => {
    const readBody = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, { signal }: RequestInit) =>
        Promise.resolve({
          ok: true,
          text: () =>
            new Promise<string>((_resolve, reject) => {
              readBody();
              signal?.addEventListener(
                'abort',
                () => reject(new DOMException('Request aborted', 'AbortError')),
                { once: true },
              );
            }),
        }),
      ),
    );

    const result = fetchOGData(URL);
    await vi.advanceTimersByTimeAsync(4999);
    expect(readBody).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({
      originUrl: URL,
      url: URL,
      error: 'Request timeout',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('parses a completed response and clears the timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<title>Example article</title>')),
    );

    await expect(fetchOGData(URL)).resolves.toMatchObject({
      originUrl: URL,
      title: 'Example article',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the timeout on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network unavailable')),
    );

    await expect(fetchOGData(URL)).resolves.toMatchObject({
      error: 'network unavailable',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the declared icon after a redirect without making any icon requests', async () => {
    vi.useRealTimers();
    const paths: string[] = [];
    const server = createServer((request, response) => {
      const path = request.url ?? '';
      paths.push(path);
      if (path === '/post') {
        response.writeHead(302, { location: '/nested/article' }).end();
      } else if (path === '/nested/article') {
        response.writeHead(200, { 'content-type': 'text/html' }).end(`
          <title>Example article</title>
          <link rel="icon" href="data:image/png,ignored">
          <link rel="shortcut icon" href="logo.png">
        `);
      } else {
        response.writeHead(200, { 'content-type': 'image/png' }).end();
      }
    });
    await once(server.listen(0, '127.0.0.1'), 'listening');

    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing test server port');
      const origin = `http://127.0.0.1:${address.port}`;
      await expect(fetchOGData(`${origin}/post`)).resolves.toMatchObject({
        originUrl: `${origin}/post`,
        title: 'Example article',
        logo: `${origin}/nested/logo.png`,
      });
      expect(paths).toEqual(['/post', '/nested/article']);
    } finally {
      server.closeAllConnections();
      await once(server.close(), 'close');
    }
  });
});
