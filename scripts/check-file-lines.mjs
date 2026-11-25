import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const maxLines = 300;
const sourceExtension =
  /\.(?:astro|[cm]?[jt]s|[jt]sx|css|scss|sass|less|styl|html?|mdx|sh|bash|zsh)$/i;
const testExtension = /\.(?:spec|test|fixture)\.[^.]+$/i;
const ignoredDirectories = new Set([
  '.astro',
  '.cache',
  '.git',
  '__fixtures__',
  '__tests__',
  'fixtures',
  'node_modules',
  'tests',
]);
const ignoredPaths = new Set([
  '.agents',
  '.claude',
  '.codex',
  '.idea',
  '.vscode',
  'coverage',
  'dist',
  'logs',
  'skills',
  'source/fonts',
  'source/posts',
  'src/cache',
  'test-results',
]);

function* sourceFiles(directory = '') {
  for (const entry of readdirSync(join(root, directory), {
    withFileTypes: true,
  })) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name) && !ignoredPaths.has(path)) {
        yield* sourceFiles(path);
      }
    } else if (
      entry.isFile() &&
      sourceExtension.test(entry.name) &&
      !testExtension.test(entry.name)
    ) {
      yield path;
    }
  }
}

const files = [...sourceFiles()].sort();
const violations = [];

for (const path of files) {
  const source = readFileSync(join(root, path), 'utf8');
  const lines = source.split(/\r\n|\n|\r/);
  const lineCount = lines.at(-1) === '' ? lines.length - 1 : lines.length;

  if (lineCount > maxLines) {
    violations.push(`${path} has ${lineCount} lines`);
  }
}

if (violations.length > 0) {
  console.error(`Source files must have at most ${maxLines} lines.`);
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${files.length} source files within the ${maxLines}-line limit.`,
  );
}
