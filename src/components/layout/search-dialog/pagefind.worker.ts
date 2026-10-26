import type { SearchRequest, SearchResponse } from './pagefind-types';

type Pagefind = {
  options: (options: { basePath: string; language: string }) => Promise<void>;
  search: (term: string) => Promise<{
    results: {
      id: string;
      data: () => Promise<{
        url: string;
        meta: { title?: string; url?: string };
        excerpt: string;
      }>;
    }[];
  }>;
};

// FIXED: One worker owns one normalized query, including its pagination cache.
// Its immutable ID owns every failure, even Pagefind's background init errors.
// Changing query terminates this engine instead of reusing rejected fragments.
self.addEventListener(
  'message',
  (event: MessageEvent<SearchRequest>) => {
    const { id, term } = event.data;
    let api: Promise<Pagefind> | undefined;
    let stage: 'module' | 'index' = 'module';
    let failed = false;
    const respond = (response: SearchResponse) => self.postMessage(response);
    const fail = () => {
      if (failed) return;
      failed = true;
      respond({ id, error: stage });
      self.close();
    };

    // Pagefind 1.4 does not return its initialization promise and swallows some
    // fetch errors. Contain ONLY this query's dependency work, not app rejections.
    const fetchResource = self.fetch.bind(self);
    self.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await fetchResource(...args);
        if (!response.ok) throw new Error(`Pagefind HTTP ${response.status}`);
        return response;
      } catch (error) {
        fail();
        throw error;
      }
    };
    self.addEventListener('unhandledrejection', (rejection) => {
      fail();
      rejection.preventDefault();
    });

    const search = async ({ limit, bundlePath, language }: SearchRequest) => {
      try {
        api ??= import(/* @vite-ignore */ `${bundlePath}pagefind.js`).then(
          async (module: Pagefind) => {
            await module.options({ basePath: bundlePath, language });
            stage = 'index';
            return module;
          },
        );
        const pagefind = await api;
        if (failed) return;
        const { results } = await pagefind.search(term);
        const loaded = await Promise.all(
          results.slice(0, limit).map(async (result) => {
            const data = await result.data();
            const url = new URL(data.meta.url || data.url, bundlePath);
            if (!['http:', 'https:'].includes(url.protocol)) {
              throw new Error('Unsupported Pagefind result URL');
            }
            return {
              id: result.id,
              url: data.meta.url || data.url,
              title: data.meta.title || data.url,
              excerpt: data.excerpt,
            };
          }),
        );
        if (!failed) respond({ id, results: loaded, total: results.length });
      } catch {
        fail();
      }
    };

    self.addEventListener(
      'message',
      ({ data }: MessageEvent<SearchRequest>) => {
        if (data.id === id && data.term === term) void search(data);
      },
    );
    void search(event.data);
  },
  { once: true },
);
