import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const guard = 'scripts/check-file-lines.mjs';
let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'astro-snow-lines-'));
  mkdirSync(join(root, 'scripts'));
  copyFileSync(new URL(`../${guard}`, import.meta.url), join(root, guard));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(path: string, content: string) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function check() {
  return spawnSync(process.execPath, [join(root, guard)], {
    cwd: tmpdir(),
    encoding: 'utf8',
  });
}

describe('source file line limit', () => {
  it('allows 300 lines with CRLF or a final line without a newline', () => {
    write('src/pages/route.astro', 'line\r\n'.repeat(300));
    write('src/styles/theme.css', 'line\n'.repeat(299) + 'line');
    write('src/config/empty.ts', '');

    const result = check();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Checked 4 source files');
  });

  it('reports new source files from the working tree and skips fixtures and generated data', () => {
    const sourcePaths = [
      'astro.config.mjs',
      'public/js/runtime.js',
      'scripts/generate.ts',
      'source/runtime.js',
      'src/pages/route.astro',
      'src/styles/theme.css',
    ];
    const excludedPaths = [
      'dist/runtime.js',
      'source/fonts/result.css',
      'src/cache/output.ts',
      'src/components/fixtures/view.astro',
      'src/lib/parser.spec.ts',
      'tests/line-limit.spec.ts',
    ];

    for (const path of [...sourcePaths, ...excludedPaths]) {
      write(path, '\n'.repeat(301));
    }

    const result = check();

    expect(result.status).toBe(1);
    expect(result.stderr.trim().split('\n')).toEqual([
      'Source files must have at most 300 lines.',
      ...sourcePaths.map((path) => `${path} has 301 lines`),
    ]);
  });
});
