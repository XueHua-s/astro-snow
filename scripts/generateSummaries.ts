import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import {
  CONTENT_GLOB,
  DEFAULT_MODEL,
  OUTPUT_FILE,
  CACHE_VERSION,
} from './lib/summaries/config';
import type {
  CacheEntry,
  SummariesCache,
  SummaryOutput,
} from './lib/summaries/types';
import {
  isCacheValid,
  loadCache,
  loadOutputSummaries,
  loadPosts,
  parseArgs,
  saveCache,
} from './lib/summaries/utils';
import { checkApiRunning, generateSummary } from './lib/summaries/api';
import { isSummaryAcceptable } from './lib/summaries/quality';

async function main() {
  const startTime = Date.now();
  const { model, force } = parseArgs(DEFAULT_MODEL);

  try {
    let cache = force ? null : await loadCache();
    if (cache && !isCacheValid(cache, model)) {
      cache = null;
    }

    const files = await glob(CONTENT_GLOB);
    if (!files.length) return;

    const posts = await loadPosts(files);
    if (!posts.length) return;

    let validCache = cache?.entries || {};
    if (!cache && !force) {
      const outputSummaries = await loadOutputSummaries();
      if (outputSummaries) {
        const seededCache: Record<string, CacheEntry> = {};
        for (const post of posts) {
          const outputEntry = outputSummaries[post.slug];
          if (!outputEntry?.summary) continue;
          if (!isSummaryAcceptable(outputEntry.summary)) continue;
          seededCache[post.slug] = {
            hash: post.hash,
            title: outputEntry.title || post.title,
            summary: outputEntry.summary,
            generatedAt: new Date().toISOString(),
          };
        }
        if (Object.keys(seededCache).length > 0) {
          validCache = seededCache;
        }
      }
    }

    const needsGeneration = posts.some((post) => {
      const hasDescription = Boolean(post.description);
      const cachedEntry = validCache[post.slug];
      const hasCache =
        cachedEntry &&
        cachedEntry.hash === post.hash &&
        isSummaryAcceptable(cachedEntry.summary);
      return !hasDescription && !(hasCache && !force);
    });

    let skipGeneration = false;
    if (needsGeneration) {
      const apiRunning = await checkApiRunning(model);
      if (!apiRunning) {
        skipGeneration = true;
        console.error(chalk.yellow('\nWarning: Cannot connect to LLM API.'));
        console.error(chalk.yellow('  - OPENAI_API_KEY is set correctly'));
        console.error(
          chalk.yellow(
            '  - OPENAI_API_BASE_URL points to the OpenAI-compatible /v1/ root',
          ),
        );
        console.error(
          chalk.yellow('  - OPENAI_MODEL is available on that provider'),
        );
        console.error(
          chalk.yellow(
            'Skipping AI generation; will output manual/cached summaries only.',
          ),
        );
      }
    }

    const newEntries: Record<string, CacheEntry> = {};
    let cached = 0;
    let generated = 0;
    let manual = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const cachedEntry = validCache[post.slug];

      if (post.description) {
        newEntries[post.slug] = {
          hash: post.hash,
          title: post.title,
          summary: post.description,
          generatedAt: new Date().toISOString(),
        };
        manual++;
        process.stdout.write(
          `\r  [${i + 1}/${posts.length}] ${chalk.blue('manual')}: ${post.slug.slice(0, 40)}...`,
        );
      } else if (
        cachedEntry &&
        cachedEntry.hash === post.hash &&
        isSummaryAcceptable(cachedEntry.summary) &&
        !force
      ) {
        newEntries[post.slug] = cachedEntry;
        cached++;
        process.stdout.write(
          `\r  [${i + 1}/${posts.length}] ${chalk.gray('cached')}: ${post.slug.slice(0, 40)}...`,
        );
      } else if (skipGeneration) {
        if (cachedEntry) {
          newEntries[post.slug] = cachedEntry;
          cached++;
        } else {
          skipped++;
        }
        process.stdout.write(
          `\r  [${i + 1}/${posts.length}] ${chalk.yellow('skipped')}: ${post.slug.slice(0, 40)}...`,
        );
      } else {
        process.stdout.write(
          `\r  [${i + 1}/${posts.length}] ${chalk.yellow('generating')}: ${post.slug.slice(0, 40)}...`,
        );

        try {
          const summary = await generateSummary(post.title, post.text, model);
          newEntries[post.slug] = {
            hash: post.hash,
            title: post.title,
            summary,
            generatedAt: new Date().toISOString(),
          };
          generated++;
        } catch (error) {
          console.error(
            chalk.red(`  Error generating summary for ${post.slug}:`),
            error,
          );
          errors++;
          if (cachedEntry) {
            newEntries[post.slug] = cachedEntry;
          }
        }
      }
    }

    const newCache: SummariesCache = {
      version: CACHE_VERSION,
      model,
      entries: newEntries,
    };
    await saveCache(newCache);

    const output: Record<string, SummaryOutput> = {};
    for (const [slug, entry] of Object.entries(newEntries)) {
      output[slug] = { title: entry.title, summary: entry.summary };
    }

    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      chalk.green(
        `\nDone. Generated ${generated}, manual ${manual}, reused ${cached}, skipped ${skipped}, errors ${errors}. (${elapsed}s)`,
      ),
    );
  } catch (error) {
    console.error(chalk.red('\nError:'), error);
    process.exitCode = 1;
  }
}

void main();
