import { describe, expect, it } from 'vitest';
import {
  Routes,
  isRoutePathActive,
  normalizeRoutePath,
  withBlogBase,
} from '../src/constants/router';

describe('router helpers', () => {
  it('withBlogBase should prefix blog base correctly', () => {
    expect(withBlogBase('/about')).toBe('/blog/about');
    expect(withBlogBase('tags')).toBe('/blog/tags');
    expect(withBlogBase('/')).toBe('/blog');
  });

  it('Routes enum should expose expected blog entry route', () => {
    expect(Routes.Home).toBe('/blog');
    expect(Routes.Post).toBe('/blog/post');
  });

  it('normalizeRoutePath should remove search, hash, and trailing slash', () => {
    expect(normalizeRoutePath('/blog/categories/?page=1#top')).toBe(
      '/blog/categories',
    );
    expect(normalizeRoutePath('https://example.com/blog/tags/react/')).toBe(
      '/blog/tags/react',
    );
  });

  it('isRoutePathActive should match exact routes and descendants', () => {
    expect(isRoutePathActive(Routes.Categories, '/blog/categories')).toBe(true);
    expect(
      isRoutePathActive(Routes.Categories, '/blog/categories/学习笔记'),
    ).toBe(true);
    expect(isRoutePathActive(Routes.Home, '/blog/posts/2')).toBe(true);
  });

  it('isRoutePathActive should reject empty and sibling-prefix paths', () => {
    expect(isRoutePathActive(undefined, '/blog/categories')).toBe(false);
    expect(isRoutePathActive(Routes.Categories, undefined)).toBe(false);
    expect(isRoutePathActive(Routes.Categories, '/blog/categories-old')).toBe(
      false,
    );
  });
});
