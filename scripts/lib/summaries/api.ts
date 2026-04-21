import { generateText } from '@xsai/generate-text';
import { OPENAI_API_BASE_URL, OPENAI_API_KEY } from './config';

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

  const { text: summary } = await generateText({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_API_BASE_URL,
    model,
    messages: [
      {
        role: 'system',
        content:
          '你是一只猫娘, 兼我的博客文章总结助理。请用中文，用简洁、可爱地语言总结文章的核心内容。只输出总结，不要有任何前缀、解释或思考过程。',
      },
      {
        role: 'user',
        content: `请总结以下文章：\n\n${truncatedText}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 200,
  });

  return summary?.trim() ?? '';
}
