import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { saveResults } from '../scripts/lib/similarities/utils';

let directory: string;
let output: string;
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'similarity-cache-'));
  output = path.join(directory, 'similarities.json');
  await fs.writeFile(output, 'previous cache');
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(directory, { recursive: true, force: true });
});

it('publishes a complete replacement and removes the temporary file', async () => {
  await saveResults({ article: [] }, output);
  expect(JSON.parse(await fs.readFile(output, 'utf8'))).toEqual({
    article: [],
  });
  expect(await fs.readdir(directory)).toEqual(['similarities.json']);
});

it('preserves the old cache and cleans up a partially written file on failure', async () => {
  const writeFile = fs.writeFile.bind(fs);
  vi.spyOn(fs, 'writeFile').mockImplementationOnce(
    async (file, _data, options) => {
      await writeFile(file, 'partial data', options);
      throw new Error('disk full');
    },
  );
  await expect(saveResults({ article: [] }, output)).rejects.toThrow(
    'disk full',
  );
  expect(await fs.readFile(output, 'utf8')).toBe('previous cache');
  expect(await fs.readdir(directory)).toEqual(['similarities.json']);
});

it('preserves the old cache when publishing fails', async () => {
  vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('permission denied'));
  await expect(saveResults({ article: [] }, output)).rejects.toThrow(
    'permission denied',
  );
  expect(await fs.readFile(output, 'utf8')).toBe('previous cache');
  expect(await fs.readdir(directory)).toEqual(['similarities.json']);
});
