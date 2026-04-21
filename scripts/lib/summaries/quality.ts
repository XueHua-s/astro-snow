const CHINESE_CHAR_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const LATIN_CHAR_RE = /[A-Za-z]/g;
const IPA_CHAR_RE = /[\u0250-\u02af]/;
const LATEX_INLINE_RE = /\$[^$\n]+\$/;
const URL_RE = /https?:\/\//i;

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

  if (normalized.length < 28 || normalized.length > 180) {
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

  return true;
}
