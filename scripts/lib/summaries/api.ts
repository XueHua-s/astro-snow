import { generateText } from '@xsai/generate-text';
import { OPENAI_API_BASE_URL, OPENAI_API_KEY } from './config';
import {
  buildFallbackSummary,
  isSummaryAcceptable,
  normalizeSummaryText,
} from './quality';

const SUMMARY_SYSTEM_PROMPT = [
  '你是中文技术博客摘要助手。',
  '输出必须以简体中文为主，英文术语只在必要时少量保留。',
  '请输出 2 句自然中文，概括文章主题、关键理由和最终结论或取舍。',
  '不要分点、不要标题、不要前缀，不要只复述最后一句。',
  '禁止输出音标、LaTeX、代码片段、链接或大段英文。',
  '只输出摘要正文。',
].join('');

const SUMMARY_REPAIR_SYSTEM_PROMPT = [
  '你是中文摘要修订助手。',
  '请把不稳定的摘要改写成自然、简洁、以简体中文为主的两句摘要。',
  '必须保留主题、关键理由和最终结论或取舍。',
  '禁止音标、LaTeX、代码、链接和大段英文。',
  '只输出摘要正文。',
].join('');

async function requestSummary(
  model: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  temperature: number,
): Promise<string> {
  const { text: summary } = await generateText({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_API_BASE_URL,
    model,
    messages,
    temperature,
    maxTokens: 220,
  });

  return normalizeSummaryText(summary ?? '');
}

export async function checkApiRunning(model: string): Promise<boolean> {
  try {
    if (!OPENAI_API_KEY) {
      return false;
    }

    const headers: Record<string, string> = {};
    headers.Authorization = `Bearer ${OPENAI_API_KEY}`;
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${OPENAI_API_BASE_URL}chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0,
        max_tokens: 1,
        stream: false,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function generateSummary(
  text: string,
  model: string,
): Promise<string> {
  const truncatedText = text.slice(0, 6000);
  const firstPass = await requestSummary(
    model,
    [
      {
        role: 'system',
        content: SUMMARY_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          '请基于下面文章生成摘要。',
          '要求：2句、中文为主、不要分点、不要标题、不要只写一句口号。',
          '文章如下：',
          truncatedText,
        ].join('\n\n'),
      },
    ],
    0.2,
  );

  if (isSummaryAcceptable(firstPass)) {
    return firstPass;
  }

  const repaired = await requestSummary(
    model,
    [
      {
        role: 'system',
        content: SUMMARY_REPAIR_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          '下面这段摘要不够稳定，请改写成更自然、以简体中文为主的博客摘要。',
          '要求：2句、45到100字、保留主题、关键理由和最终结论，不要音标、LaTeX、代码、链接和大段英文。',
          `原摘要：${firstPass || '（空）'}`,
          '参考文章：',
          truncatedText,
        ].join('\n\n'),
      },
    ],
    0.1,
  );

  if (isSummaryAcceptable(repaired)) {
    return repaired;
  }

  const fallback = buildFallbackSummary(truncatedText);
  if (isSummaryAcceptable(fallback)) {
    return fallback;
  }

  if (isSummaryAcceptable(firstPass)) {
    return firstPass;
  }

  throw new Error('Unable to generate a stable Chinese summary');
}
