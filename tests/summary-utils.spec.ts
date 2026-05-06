import { describe, expect, it } from 'vitest';

import { normalizeOpenAIBaseUrl } from '../scripts/lib/summaries/config';
import { extractSlug } from '../scripts/lib/summaries/utils';

describe('summary utils', () => {
  it('strips markdown extensions case-insensitively', () => {
    expect(extractSlug('source/posts/Electron实战学习小记.MD')).toBe(
      'electron实战学习小记',
    );
  });

  it('prefers the explicit frontmatter link when provided', () => {
    expect(extractSlug('source/posts/任意文件名.MD', '自定义-link')).toBe(
      '自定义-link',
    );
  });

  it('normalizes OpenAI-compatible base URLs with a trailing slash', () => {
    expect(normalizeOpenAIBaseUrl('https://api.openai.com/v1')).toBe(
      'https://api.openai.com/v1/',
    );
    expect(normalizeOpenAIBaseUrl(' https://example.com/openai/v1/ ')).toBe(
      'https://example.com/openai/v1/',
    );
  });
});
