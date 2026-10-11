export const CONTENT_GLOB = 'source/posts/**/*.{md,MD}';
export const CACHE_FILE = '.cache/summaries-cache.json';
export const OUTPUT_FILE = 'src/cache/summaries.json';
export const CACHE_VERSION = '4';

const configuredBaseUrl = process.env.OPENAI_API_BASE_URL?.trim();
const baseUrl = (configuredBaseUrl || 'https://proxy.xhblog.top/v1').replace(
  /\/+$/,
  '',
);

// FIXED: Use the configured OpenAI-compatible proxy by default. Accept both
// the proxy root and an explicit /v1 endpoint without producing malformed URLs.
export const OPENAI_API_BASE_URL = /\/v1$/i.test(baseUrl)
  ? `${baseUrl}/`
  : `${baseUrl}/v1/`;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? '';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-6.1-sol';

export const EXCLUDE_PATTERNS = ['weekly-'];
