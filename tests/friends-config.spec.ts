import { describe, expect, it } from 'vitest';
import { friendsData } from '../src/config/friends-config';

describe('friends config', () => {
  it('keeps the newest Lengxi friend link first', () => {
    expect(friendsData[0]).toEqual({
      site: '冷汐的杂货铺',
      url: 'https://lengxiqwq.com',
      owner: '冷汐OωO',
      desc: '你好谢谢小笼包再见',
      image:
        'https://weavatar.com/avatar/52f243e67ccc2293d68c6f33db3f4083?s=640',
      color: '#ff9b94',
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
