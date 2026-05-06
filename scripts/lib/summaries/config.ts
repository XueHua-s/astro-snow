export const CONTENT_GLOB = 'source/posts/**/*.{md,MD}';
export const CACHE_FILE = '.cache/summaries-cache.json';
export const OUTPUT_FILE = 'src/cache/summaries.json';
export const CACHE_VERSION = '4';

export function normalizeOpenAIBaseUrl(value: string | undefined): string {
  const baseUrl = value?.trim() || 'https://api.openai.com/v1/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

// FIXED: Summary generation now defaults to the official OpenAI endpoint.
export const OPENAI_API_BASE_URL = normalizeOpenAIBaseUrl(
  process.env.OPENAI_API_BASE_URL,
);
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? '';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
export const REQUIRE_AI_SUMMARIES =
  process.env.REQUIRE_AI_SUMMARIES?.trim() === '1';

export const EXCLUDE_PATTERNS = ['weekly-'];
