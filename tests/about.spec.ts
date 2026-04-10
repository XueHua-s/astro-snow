import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/lib/markdown';

const ABOUT_PAGE_PATH = 'src/pages/blog/about.md';

describe('about markdown content', () => {
  it('should keep github section and repository cards renderable', async () => {
    const source = await readFile(ABOUT_PAGE_PATH, 'utf-8');
    const { content } = matter(source);
    const html = await renderMarkdown(content);

    expect(html).toContain('<h2>Skills</h2>');
    expect(html).toContain('<h2>📊 GitHub Stats</h2>');
    expect(html).toContain('<h2>🧠 Top Languages</h2>');
    expect(html).toContain('<h2>📌 Participation in projects</h2>');

    const repoCardMatches =
      html.match(/https:\/\/github-readme\.xhblog\.top\/api\/pin\?/g) ?? [];
    expect(repoCardMatches).toHaveLength(4);
  });
});
