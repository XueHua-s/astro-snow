import { describe, expect, it } from 'vitest';
import { friendsData } from '../src/config/friends-config';

describe('friends config', () => {
  it('keeps the newest Smirnova Oyama friend link first', () => {
    expect(friendsData[0]).toEqual({
      site: 'Smirnova Oyama',
      url: 'https://mahiro.uk/',
      owner: 'Smirnova',
      desc: 'An undergraduate student from China.',
      image: 'https://mahiro.uk/favicon.ico',
      color: '#c6613f',
    });
  });

  it('contains no malformed or duplicate friend link URLs', () => {
    const urls = friendsData.map(({ url }) => url);

    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(() => new URL(url)).not.toThrow();
      expect(new URL(url).protocol).toMatch(/^https?:$/);
    }
  });
});
