const CHINESE_CHAR_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const LATIN_CHAR_RE = /[A-Za-z]/g;
const IPA_CHAR_RE = /[\u0250-\u02af]/;
const LATEX_INLINE_RE = /\$[^$\n]+\$/;
const URL_RE = /https?:\/\//i;
const HTML_TAG_RE = /<[^>]+>/;
const PLACEHOLDER_RE = /\[(?:END|\|SUMMARY\|)\]/i;
const APOLOGY_RE = /很抱歉|请将需要摘要的文章完整粘贴|文章内容为空/;
const LIST_ARTIFACT_RE = /(?:^|\s)-\s.{0,40}(?:-\s.{0,40}){3,}/;

export function normalizeSummaryText(text: string): string {
  let normalized = text.replace(/\s+/g, ' ').trim();
  normalized = normalized.replace(/^[“”"'‘’]+|[“”"'‘’]+$/g, '');

  if (normalized && !/[。！？.!?]$/.test(normalized)) {
    normalized += '。';
  }

  return normalized;
}

export function countChineseChars(text: string): number {
  return (text.match(CHINESE_CHAR_RE) ?? []).length;
}

export function countLatinChars(text: string): number {
  return (text.match(LATIN_CHAR_RE) ?? []).length;
}

export function isSummaryAcceptable(text: string): boolean {
  const normalized = normalizeSummaryText(text);
  if (!normalized) return false;

  const chineseCount = countChineseChars(normalized);
  const latinCount = countLatinChars(normalized);

  if (normalized.length < 28 || normalized.length > 260) {
    return false;
  }

  if (chineseCount < 18) {
    return false;
  }

  if (latinCount > chineseCount * 0.8) {
    return false;
  }

  if (IPA_CHAR_RE.test(normalized)) {
    return false;
  }

  if (LATEX_INLINE_RE.test(normalized)) {
    return false;
  }

  if (URL_RE.test(normalized)) {
    return false;
  }

  if (HTML_TAG_RE.test(normalized)) {
    return false;
  }

  if (PLACEHOLDER_RE.test(normalized)) {
    return false;
  }

  if (APOLOGY_RE.test(normalized)) {
    return false;
  }

  if (LIST_ARTIFACT_RE.test(normalized)) {
    return false;
  }

  return true;
}

export function buildFallbackSummary(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const sentences = normalized
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean);

  const picked: string[] = [];
  let total = 0;

  for (const sentence of sentences) {
    if (sentence.length < 10) continue;
    if (picked.length >= 2) break;
    if (total + sentence.length > 120 && picked.length > 0) break;
    picked.push(sentence);
    total += sentence.length;
  }

  const fallback = picked.join('');
  if (fallback) {
    return normalizeSummaryText(fallback);
  }

  return normalizeSummaryText(normalized.slice(0, 100));
}
