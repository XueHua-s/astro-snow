import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';
import chalk from 'chalk';
import {
  EXCLUDE_PATTERNS,
  CACHE_FILE,
  OUTPUT_FILE,
  CACHE_VERSION,
} from './config';
import type { PostData, SummariesCache, SummaryOutput } from './types';

export function parseArgs(defaultModel: string): {
  model: string;
  force: boolean;
} {
  const args = process.argv.slice(2);
  let model = defaultModel;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { model, force };
}

export function shouldExclude(slug: string): boolean {
  return EXCLUDE_PATTERNS.some((pattern) => slug.includes(pattern));
}

export function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

export async function loadCache(): Promise<SummariesCache | null> {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(data) as SummariesCache;
  } catch {
    return null;
  }
}

export async function loadOutputSummaries(): Promise<Record<
  string,
  SummaryOutput
> | null> {
  try {
    const data = await fs.readFile(OUTPUT_FILE, 'utf-8');
    return JSON.parse(data) as Record<string, SummaryOutput>;
  } catch {
    return null;
  }
}

export async function saveCache(cache: SummariesCache): Promise<void> {
  const dir = path.dirname(CACHE_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
}

export function isCacheValid(cache: SummariesCache, model: string): boolean {
  return cache.version === CACHE_VERSION && cache.model === model;
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
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function extractSlug(filePath: string, link?: string): string {
  if (link) return link;
  const relativePath = filePath
    .replace(/^source\/posts\//, '')
    .replace(/\.md$/i, '');
  return relativePath.toLowerCase();
}

export async function processFile(filePath: string): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    if (frontmatter.draft || !frontmatter.title) return null;

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);
    if (shouldExclude(slug)) return null;

    const description = (frontmatter.description as string | undefined)?.trim();
    const plainText = await getPlainText(body);
    const hash = computeHash(content);

    return {
      slug,
      title: frontmatter.title as string,
      description,
      text: plainText,
      hash,
    };
  } catch (error) {
    console.error(chalk.red(`  Error processing ${filePath}:`), error);
    return null;
  }
}

export async function loadPosts(files: string[]): Promise<PostData[]> {
  const posts: PostData[] = [];
  for (let i = 0; i < files.length; i++) {
    process.stdout.write(`\r  Processing ${i + 1}/${files.length}...`);
    const post = await processFile(files[i]);
    if (post) posts.push(post);
  }
  return posts;
}
