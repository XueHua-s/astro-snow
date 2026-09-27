import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateEmbeddings,
  getEmbeddingConfig,
} from '../scripts/lib/similarities/embedding';

const post = (text = '文章内容') => ({
  slug: text,
  title: text,
  description: '',
  text,
});
const response = (data: unknown) => new Response(JSON.stringify({ data }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function mockFetch() {
  vi.stubEnv('EMBEDDING_API_KEY', 'test-key');
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

describe('remote embeddings', () => {
  it('batches inputs, restores response order, and normalizes vectors', async () => {
    const fetcher = mockFetch();
    fetcher.mockImplementation((_url, options) => {
      const { input, model } = JSON.parse(options?.body as string) as {
        input: string[];
        model: string;
      };
      expect(model).toBe('qwen3.7-text-embedding-flash');
      expect(input.length).toBeLessThanOrEqual(20);
      return Promise.resolve(
        response(
          input
            .map((_: string, index: number) => ({
              index,
              embedding: index === 0 ? [3, 4] : [0, 2],
            }))
            .reverse(),
        ),
      );
    });
    const vectors = await generateEmbeddings(
      Array.from({ length: 21 }, () => post()),
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe(
      'https://ws-d6xu5os7fn629sa4.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/embeddings',
    );
    expect(vectors).toHaveLength(21);
    expect(vectors[0][0]).toBeCloseTo(0.6);
    expect(Array.from(vectors[1])).toEqual([0, 1]);
  });

  it('does not request for empty posts and rejects blank text', async () => {
    const fetcher = mockFetch();
    expect(await generateEmbeddings([])).toEqual([]);
    await expect(generateEmbeddings([post(' ')])).rejects.toThrow('empty');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires credentials and a secure base URL', () => {
    vi.stubEnv('EMBEDDING_API_KEY', '');
    expect(getEmbeddingConfig).toThrow('EMBEDDING_API_KEY');
    vi.stubEnv('EMBEDDING_API_KEY', 'test-key');
    vi.stubEnv('EMBEDDING_API_BASE_URL', 'http://example.com/v1');
    expect(getEmbeddingConfig).toThrow('HTTPS');
    vi.stubEnv('EMBEDDING_API_BASE_URL', 'https://example.com/v1');
    expect(getEmbeddingConfig().endpoint).toBe(
      'https://example.com/v1/embeddings',
    );
  });

  it.each([
    [],
    [{ index: 1, embedding: [1, 2] }],
    [{ index: 0, embedding: [] }],
    [{ index: 0, embedding: [0, 0] }],
    [{ index: 0, embedding: ['1', 2] }],
    [{ index: 0, embedding: [1e300, 2] }],
  ])('rejects malformed vectors: %j', async (...data) => {
    const fetcher = mockFetch();
    fetcher.mockResolvedValue(response(data));
    await expect(generateEmbeddings([post()])).rejects.toThrow();
  });

  it('rejects duplicate indices and inconsistent dimensions', async () => {
    const fetcher = mockFetch();
    fetcher.mockResolvedValueOnce(
      response([
        { index: 0, embedding: [1, 2] },
        { index: 0, embedding: [1, 2] },
      ]),
    );
    await expect(generateEmbeddings([post(), post()])).rejects.toThrow('index');
    fetcher.mockResolvedValueOnce(
      response([
        { index: 0, embedding: [1, 2] },
        { index: 1, embedding: [1] },
      ]),
    );
    await expect(generateEmbeddings([post(), post()])).rejects.toThrow(
      'inconsistent',
    );
  });

  it.each([429, 500, 503])('retries HTTP %i', async (status) => {
    vi.useFakeTimers();
    const fetcher = mockFetch();
    fetcher
      .mockResolvedValueOnce(new Response('', { status }))
      .mockResolvedValueOnce(response([{ index: 0, embedding: [1] }]));
    const result = generateEmbeddings([post()]);
    await vi.runAllTimersAsync();
    await expect(result).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not retry authentication failures or expose the response body', async () => {
    const fetcher = mockFetch();
    fetcher.mockResolvedValue(
      new Response('sensitive provider body', { status: 401 }),
    );
    await expect(generateEmbeddings([post()])).rejects.toThrow(
      'Embedding API returned HTTP 401.',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('bounds network retries and sanitizes failures', async () => {
    vi.useFakeTimers();
    const fetcher = mockFetch();
    fetcher.mockRejectedValue(new Error('sensitive network detail'));
    const result = expect(generateEmbeddings([post()])).rejects.toThrow(
      'after 3 attempts',
    );
    await vi.runAllTimersAsync();
    await result;
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('rejects invalid JSON', async () => {
    const fetcher = mockFetch();
    fetcher.mockResolvedValue(new Response('not json'));
    await expect(generateEmbeddings([post()])).rejects.toThrow('invalid JSON');
  });
});
