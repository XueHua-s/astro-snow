import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';
import chalk from 'chalk';
import { remark } from 'remark';
import strip from 'strip-markdown';
import {
  EXCLUDE_PATTERNS,
  INCLUDE_BODY,
  SUMMARIES_FILE,
  USE_AI_SUMMARY,
} from './config';
import type {
  PostData,
  SimilarityMap,
  SimilarPost,
  SummariesMap,
} from './types';

export function shouldExclude(slug: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => slug.includes(pattern));
}

export async function loadSummaries(): Promise<SummariesMap> {
  if (!USE_AI_SUMMARY) return {};
  try {
    const data = await fs.readFile(SUMMARIES_FILE, 'utf-8');
    return JSON.parse(data) as SummariesMap;
  } catch {
    return {};
  }
}

export function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export async function getPlainText(markdown: string): Promise<string> {
  const result = await remark().use(strip).process(markdown);
  return String(result)
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(
      /^\s*(TLDR|Introduction|Conclusion|Summary|References?|Footnotes?)\s*$/gim,
      '',
    )
    .replace(/^[A-Z\s]{4,}$/gm, '')
    .replace(/^\|.*\|$/gm, '')
    .replace(/^:::.*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function extractSlug(filePath: string, link?: string): string {
  if (link) return link;
  const relativePath = filePath
    .replace(/^source\/posts\//, '')
    .replace(/\.md$/, '');
  return relativePath.toLowerCase();
}

export async function processFile(
  filePath: string,
  summaries: SummariesMap,
): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    if (frontmatter.draft || !frontmatter.title) {
      return null;
    }

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);
    if (shouldExclude(slug)) {
      return null;
    }

    const aiSummary = summaries[slug]?.summary;
    const description = aiSummary || (frontmatter.description as string) || '';
    let fullText = `${frontmatter.title}. ${description}`;

    if (INCLUDE_BODY) {
      const plainText = await getPlainText(body);
      fullText = `${fullText} ${plainText}`.slice(0, 8000);
    }

    return {
      slug,
      title: frontmatter.title as string,
      description,
      text: fullText,
    };
  } catch (error) {
    console.error(chalk.red(`  Error processing ${filePath}:`), error);
    return null;
  }
}

export async function loadPosts(
  files: string[],
  summaries: SummariesMap,
): Promise<PostData[]> {
  const posts: PostData[] = [];
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`\r  Processing ${i + 1}/${files.length}...`);
    const post = await processFile(files[i], summaries);
    if (post) posts.push(post);
  }
  return posts;
}

export function computeSimilarities(
  posts: PostData[],
  embeddings: Float32Array[],
  topN: number,
): SimilarityMap {
  const result: SimilarityMap = {};

  for (let i = 0; i < posts.length; i++) {
    const similarities: SimilarPost[] = [];

    for (let j = 0; j < posts.length; j++) {
      if (i === j) continue;

      const similarity = dotProduct(embeddings[i], embeddings[j]);
      similarities.push({
        slug: posts[j].slug,
        title: posts[j].title,
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    result[posts[i].slug] = similarities.slice(0, topN);
  }

  return result;
}

export async function saveResults(
  data: SimilarityMap,
  outputPath: string,
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  // FIXED: Publish atomically so a failed write cannot truncate the previous cache.
  const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(data, null, 2) + '\n', {
      flag: 'wx',
    });
    await fs.rename(temporaryPath, outputPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}
