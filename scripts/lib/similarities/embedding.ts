import { setTimeout as delay } from 'node:timers/promises';
import type { PostData } from './types';
import { normalize } from './utils';
import { MODEL_NAME } from './config';

export function getEmbeddingConfig() {
  const apiKey = process.env.EMBEDDING_API_KEY?.trim();
  if (!apiKey) throw new Error('EMBEDDING_API_KEY is required.');
  const baseUrl = new URL(
    process.env.EMBEDDING_API_BASE_URL?.trim() ||
      'https://ws-d6xu5os7fn629sa4.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/',
  );
  if (
    baseUrl.protocol !== 'https:' ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error(
      'EMBEDDING_API_BASE_URL must be an HTTPS base URL without credentials, query or fragment.',
    );
  }
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/`;
  return { apiKey, endpoint: new URL('embeddings', baseUrl).href };
}

async function requestEmbeddings(
  input: string[],
  config: ReturnType<typeof getEmbeddingConfig>,
): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch(config.endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          input,
          encoding_format: 'float',
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      if (attempt < 2) {
        await delay(1000 * 2 ** attempt);
        continue;
      }
      throw new Error(
        'Embedding request failed after 3 attempts (network error or timeout).',
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await delay(1000 * 2 ** attempt);
        continue;
      }
      // FIXED: Do not log provider bodies, which can echo credentials or article text.
      throw new Error(`Embedding API returned HTTP ${response.status}.`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error(
        'Embedding API returned invalid JSON or an incomplete response.',
      );
    }
  }
  throw new Error('Embedding request failed.');
}

export async function generateEmbeddings(
  posts: PostData[],
): Promise<Float32Array[]> {
  if (!posts.length) return [];
  if (posts.some((post) => !post.text.trim()))
    throw new Error('Embedding input must not be empty.');
  const config = getEmbeddingConfig();
  const embeddings: Float32Array[] = [];
  let dimension: number | undefined;

  // FIXED: Keep requests within the provider's 20-input limit and restore index order.
  for (let offset = 0; offset < posts.length; offset += 20) {
    const batch = posts.slice(offset, offset + 20);
    const result = await requestEmbeddings(
      batch.map((post) => post.text),
      config,
    );
    if (
      !result ||
      typeof result !== 'object' ||
      !('data' in result) ||
      !Array.isArray(result.data) ||
      result.data.length !== batch.length
    ) {
      throw new Error('Embedding API returned an invalid result count.');
    }
    const ordered = new Array<Float32Array>(batch.length);
    const items: unknown[] = result.data;
    for (const item of items) {
      if (
        !item ||
        typeof item !== 'object' ||
        !('index' in item) ||
        typeof item.index !== 'number' ||
        !('embedding' in item) ||
        !Number.isInteger(item.index) ||
        item.index < 0 ||
        item.index >= batch.length ||
        ordered[item.index] ||
        !Array.isArray(item.embedding) ||
        !item.embedding.length ||
        !item.embedding.every(
          (value: unknown) =>
            typeof value === 'number' && Number.isFinite(value),
        )
      ) {
        throw new Error('Embedding API returned an invalid index or vector.');
      }
      const vector = new Float32Array(item.embedding);
      dimension ??= vector.length;
      if (
        vector.length !== dimension ||
        !vector.every(Number.isFinite) ||
        !Math.hypot(...vector)
      ) {
        throw new Error(
          'Embedding API returned a zero, non-finite or inconsistent vector.',
        );
      }
      ordered[item.index] = normalize(vector);
    }
    embeddings.push(...ordered);
    console.log(`  Embedded ${embeddings.length}/${posts.length} posts.`);
  }
  return embeddings;
}
