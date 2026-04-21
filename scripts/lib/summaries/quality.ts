const CHINESE_CHAR_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const LATIN_CHAR_RE = /[A-Za-z]/g;
const IPA_CHAR_RE = /[\u0250-\u02af]/;
const LATEX_INLINE_RE = /\$[^$\n]+\$/;
const URL_RE = /https?:\/\//i;
const HTML_TAG_RE = /<\/?(?:[a-z]+[a-z0-9-]*)(?:\s[^>]*)?>/;
const PLACEHOLDER_RE = /\[(?:END|\|SUMMARY\|)\]/i;
const APOLOGY_RE =
  /很抱歉|请将需要摘要的文章完整粘贴|文章内容为空|文章正文还没有给|忘记粘贴真正的文章内容|请把文章内容贴上来|没法变出摘要|内容太短|无法总结|没看到文章内容|空空如也|重新发一下|提供完整的文章|给的文章是|猫猫在这里等着|文章贴上来吗|没有原文|没有粘贴文章内容|请提供需要总结的文章内容|编不出魔法/;
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

function buildTitleOnlyFallback(title: string): string {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  if (!cleanTitle) return '';

  return normalizeSummaryText(
    `这篇《${cleanTitle}》主要把当时围绕这个主题的记录和想法先记了下来，方便之后回头翻看喵`,
  );
}

function attachTitleContext(summary: string, title: string): string {
  const normalized = normalizeSummaryText(summary);
  const cleanTitle = title.replace(/\s+/g, ' ').trim();

  if (!cleanTitle) {
    return normalized;
  }

  const summaryBody = normalized.replace(/[。！？.!?]+$/, '');
  if (!summaryBody) {
    return buildTitleOnlyFallback(cleanTitle);
  }

  if (countChineseChars(summaryBody) < 8) {
    return buildTitleOnlyFallback(cleanTitle);
  }

  if (summaryBody.startsWith(cleanTitle)) {
    return normalizeSummaryText(summaryBody);
  }

  return normalizeSummaryText(`${cleanTitle}这篇文章主要记录了${summaryBody}`);
}

export function buildFallbackSummary(text: string, title: string = ''): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return buildTitleOnlyFallback(title);

  const sentences = normalized
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean);

  const picked: string[] = [];
  let total = 0;

  for (const sentence of sentences) {
    if (sentence.length < 10) continue;
    if (picked.length >= 3) break;
    if (total + sentence.length > 140 && picked.length > 0) break;
    picked.push(sentence);
    total += sentence.length;
    if (total >= 36 && picked.length >= 2) break;
  }

  const fallback = picked.join('');
  if (fallback && isSummaryAcceptable(fallback)) {
    return normalizeSummaryText(fallback);
  }

  const chineseFirst = normalized
    .replace(URL_RE, ' ')
    .replace(LATEX_INLINE_RE, ' ')
    .replace(/[A-Za-z][A-Za-z0-9./:+_#-]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const chineseChunks =
    chineseFirst.match(
      /[\u3400-\u4dbf\u4e00-\u9fff0-9，。！？；：、“”‘’（）]{6,}/g,
    ) ?? [];

  if (chineseChunks.length > 0) {
    const compactChunks: string[] = [];
    let chunkTotal = 0;
    for (const chunk of chineseChunks) {
      if (compactChunks.length >= 3) break;
      if (chunkTotal + chunk.length > 120 && compactChunks.length > 0) break;
      compactChunks.push(chunk.trim());
      chunkTotal += chunk.length;
      if (chunkTotal >= 36 && compactChunks.length >= 2) break;
    }

    const chunkFallback = compactChunks.join('。 ');
    if (chunkFallback) {
      const chunkCandidate = attachTitleContext(chunkFallback, title);
      if (isSummaryAcceptable(chunkCandidate)) {
        return chunkCandidate;
      }
    }
  }

  const finalCandidate = attachTitleContext(
    chineseFirst.slice(0, 100) || normalized.slice(0, 100),
    title,
  );
  if (isSummaryAcceptable(finalCandidate)) {
    return finalCandidate;
  }

  return buildTitleOnlyFallback(title) || finalCandidate;
}
