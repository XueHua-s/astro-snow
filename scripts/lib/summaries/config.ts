export const CONTENT_GLOB = 'source/posts/**/*.{md,MD}';
export const CACHE_FILE = '.cache/summaries-cache.json';
export const OUTPUT_FILE = 'src/cache/summaries.json';
export const CACHE_VERSION = '3';

// FIXED: Summary generation now defaults to the official OpenAI endpoint.
export const OPENAI_API_BASE_URL =
  process.env.OPENAI_API_BASE_URL?.trim() || 'https://api.openai.com/v1/';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? '';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

export const EXCLUDE_PATTERNS = ['weekly-'];
