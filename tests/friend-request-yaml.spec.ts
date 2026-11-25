import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { generateFriendYaml } from '../src/components/friends/friend-request/yaml';

describe('friend request YAML', () => {
  it('round-trips punctuation, numeric text, quotes, and multiple lines as strings', () => {
    const form = {
      site: 'Snow: notes # example',
      url: 'https://example.com/?t=a:b',
      owner: '00123',
      desc: '"First line"\nsecond: line\n\tthird line',
      image: 'https://example.com/cover.jpg',
      color: '#ff"00',
    };

    expect(load(generateFriendYaml(form))).toEqual(form);
  });

  it('returns existing placeholders for empty fields', () => {
    const yaml = generateFriendYaml({
      site: '',
      url: '',
      owner: '',
      desc: '',
      image: '',
      color: '',
    });

    expect(load(yaml)).toEqual({
      site: '站点名称',
      url: 'https://example.com',
      owner: '您的昵称',
      desc: '站点描述',
      image: 'https://example.com/avatar.jpg',
      color: '#ffc0cb',
    });
  });
});
