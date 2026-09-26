import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const buildDirectory = fileURLToPath(new URL('../../docs/', import.meta.url));
const maxPagesAssetSize = 25 * 1024 * 1024;

async function listBuildFiles(directory, relativeDirectory = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = join(relativeDirectory, entry.name);
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listBuildFiles(absolutePath, relativePath);
      }

      const details = await stat(absolutePath);
      return [{ path: relativePath, size: details.size }];
    })
  );

  return nestedFiles.flat();
}

test('production build includes Cloudflare Pages isolation headers', async () => {
  const headers = await readFile(join(buildDirectory, '_headers'), 'utf8');

  expect(headers).toBe(
    [
      '/*',
      '  Cross-Origin-Opener-Policy: same-origin',
      '  Cross-Origin-Embedder-Policy: require-corp',
      '',
    ].join('\n')
  );
});

test('production build is static and fits Cloudflare Pages asset limits', async () => {
  const files = await listBuildFiles(buildDirectory);
  const oversizedFiles = files.filter((file) => file.size > maxPagesAssetSize);
  const paths = files.map((file) => file.path);

  expect(oversizedFiles).toEqual([]);
  expect(paths.some((path) => path.endsWith('.wasm'))).toBe(true);
  expect(
    paths.some((path) =>
      /(^|[\\/])functions([\\/]|$)|(^|[\\/])_worker\.js$/.test(path)
    )
  ).toBe(false);
});

test('production preview serves isolation headers and browser solver assets', async ({
  page,
}) => {
  const wasmResponses = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.wasm')) {
      wasmResponses.push(response.status());
    }
  });

  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(response.headers()['cross-origin-embedder-policy']).toBe(
    'require-corp'
  );
  await expect
    .poll(() => page.evaluate(() => window.crossOriginIsolated))
    .toBe(true);

  await page.getByLabel('Number of Participants').fill('6');
  await page.getByLabel('Number of Tables').fill('2');
  await page.getByLabel('Number of Rounds').fill('2');
  await page.getByLabel('Time Limit (seconds)').fill('10');
  await page.getByRole('button', { name: 'Generate Schedule' }).click();

  await expect(
    page.getByRole('heading', { name: 'Schedule Results' })
  ).toBeVisible();
  expect(wasmResponses.length).toBeGreaterThan(0);
  expect(wasmResponses.every((status) => status === 200)).toBe(true);
});
