import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import readingTime from 'reading-time';

const { getCollection } = vi.hoisted(() => ({ getCollection: vi.fn() }));
vi.mock('astro:content', () => ({ getCollection }));
vi.mock('reading-time', async (importOriginal) => {
  const { default: calculate } =
    await importOriginal<typeof import('reading-time')>();
  return { default: vi.fn(calculate) };
});

beforeEach(() => {
  vi.resetModules();
  getCollection.mockReset();
  vi.mocked(readingTime).mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe('site statistics', () => {
  it('retries all footer branches after a temporary production content failure', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
    const { getLayoutFooterData } =
      await import('../src/lib/layout/footer-data');
    getCollection.mockRejectedValueOnce(new Error('content unavailable'));

    await expect(getLayoutFooterData()).rejects.toThrow('content unavailable');
    expect(getCollection).toHaveBeenCalledTimes(1);

    const newer = {
      id: 'newer',
      data: { date: new Date('2026-02-01') },
      body: 'one two',
    };
    const older = {
      id: 'older',
      data: { date: new Date('2026-01-01') },
      body: 'three',
    };
    getCollection.mockResolvedValueOnce([newer, older]);
    const footer = await getLayoutFooterData();

    expect(footer.stats).toMatchObject({ postCount: 2, totalWords: 3 });
    expect(footer.postFooter.postIndexMap).toEqual(
      new Map([
        ['older', 1],
        ['newer', 2],
      ]),
    );
    expect(footer.postFooter.randomPosts).toEqual(
      expect.arrayContaining([newer, older]),
    );
    expect(getCollection).toHaveBeenCalledTimes(2);
  });

  it('shares a retryable production calculation across pages', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('DEV', false);
    const { getSiteStats } = await import('../src/lib/stats');
    getCollection.mockRejectedValueOnce(new Error('content unavailable'));
    const attempts = await Promise.allSettled([getSiteStats(), getSiteStats()]);

    expect(attempts.map(({ status }) => status)).toEqual([
      'rejected',
      'rejected',
    ]);
    expect(getCollection).toHaveBeenCalledTimes(1);

    getCollection.mockResolvedValueOnce([{ body: 'one two' }, {}]);
    const [first, second] = await Promise.all([getSiteStats(), getSiteStats()]);
    expect(first).toEqual({
      totalWords: 2,
      totalMinutes: 1,
      formattedWords: '2',
      formattedTime: '0:01',
      postCount: 2,
    });
    expect(second).toEqual(first);
    first.totalWords = 0;
    expect((await getSiteStats()).totalWords).toBe(2);
    expect(getCollection).toHaveBeenCalledTimes(2);
    expect(readingTime).toHaveBeenCalledTimes(2);
  });

  it('reads new Markdown content on every dev call', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    const { getSiteStats } = await import('../src/lib/stats');
    getCollection
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ body: 'one two three' }]);

    expect((await getSiteStats()).postCount).toBe(0);
    expect((await getSiteStats()).totalWords).toBe(3);
    expect(getCollection).toHaveBeenCalledTimes(2);
  });
});
