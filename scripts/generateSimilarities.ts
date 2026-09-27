import { glob } from 'glob';
import chalk from 'chalk';
import {
  CONTENT_GLOB,
  OUTPUT_FILE,
  TOP_N_SIMILAR,
} from './lib/similarities/config';
import { generateEmbeddings } from './lib/similarities/embedding';
import {
  computeSimilarities,
  loadPosts,
  loadSummaries,
  saveResults,
} from './lib/similarities/utils';

async function main() {
  const startTime = Date.now();

  try {
    const [summaries, files] = await Promise.all([
      loadSummaries(),
      glob(CONTENT_GLOB),
    ]);
    if (!files.length) return;

    const posts = await loadPosts(files, summaries);
    if (!posts.length) return;

    const embeddings = await generateEmbeddings(posts);
    if (!embeddings.length) return;

    const similarities = computeSimilarities(posts, embeddings, TOP_N_SIMILAR);
    await saveResults(similarities, OUTPUT_FILE);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const entryCount = Object.keys(similarities).length;
    console.log(
      chalk.green(`\nDone. Saved ${entryCount} similarities in ${elapsed}s.`),
    );
  } catch (error) {
    console.error(chalk.red('\nError:'), error);
    process.exitCode = 1;
  }
}

void main();
