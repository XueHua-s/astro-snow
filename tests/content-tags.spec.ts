import { describe, expect, it } from 'vitest';
import type { BlogPost } from '../src/types/blog';
import {
  getAllTags,
  getTagPostMap,
  getTagRouteNames,
  normalizePostTags,
} from '../src/lib/content/tags';

function post(id: string, tags?: string | string[]): BlogPost {
  return {
    id,
    collection: 'blog',
    data: { title: id, date: new Date(0), tags },
  };
}

describe('tag listings', () => {
  it('groups known spelling variants without duplicating a post or editing its labels', () => {
    const first = post('one', ['node.js', 'Node.js', 'TypeScript']);
    const second = post('two', ['Typescript', 'Node.js']);
    const posts = [first, second, post('untagged')];

    expect([...getTagPostMap(posts)]).toEqual([
      ['Node.js', [first, second]],
      ['TypeScript', [first, second]],
    ]);
    expect(getAllTags(posts)).toEqual({ 'Node.js': 2, TypeScript: 2 });
    expect(normalizePostTags(first.data.tags)).toEqual([
      'node.js',
      'Node.js',
      'TypeScript',
    ]);
  });

  it('retains exactly the known legacy URLs and preserves other case variants', () => {
    expect(getTagRouteNames('Node.js')).toEqual(['Node.js', 'node.js']);
    expect(getTagRouteNames('Typescript')).toEqual([
      'TypeScript',
      'Typescript',
    ]);
    expect(getTagRouteNames('VUE2')).toEqual(['VUE2']);
    expect(getAllTags([post('one', 'VUE2'), post('two', 'Vue2')])).toEqual({
      VUE2: 1,
      Vue2: 1,
    });
  });
});
