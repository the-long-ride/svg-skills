import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSearchPage, parseIconPage, normalizeIconRef, buildSearchUrl, downloadUrlFor } from '../src/svgrepo.js';

test('parses unique public SVG Repo icon results', async () => {
  const html = await readFile(new URL('file://' + process.cwd() + '/test/fixtures/search.html'), 'utf8');
  assert.deepEqual(parseSearchPage(html, 10), [
    { id: '384415', slug: 'database-storage', title: 'Database Storage SVG Vector', url: 'https://www.svgrepo.com/svg/384415/database-storage' },
    { id: '503162', slug: 'api', title: 'API SVG Vector Icon', url: 'https://www.svgrepo.com/svg/503162/api' }
  ]);
});

test('parses icon metadata from public icon page', async () => {
  const html = await readFile(new URL('file://' + process.cwd() + '/test/fixtures/icon.html'), 'utf8');
  const icon = parseIconPage(html, 'https://www.svgrepo.com/svg/384415/database-storage');
  assert.equal(icon.id, '384415');
  assert.equal(icon.slug, 'database-storage');
  assert.equal(icon.title, 'Database Storage SVG Vector');
  assert.equal(icon.license, 'CC0 License');
  assert.equal(icon.collection, 'SVG Vector');
  assert.equal(icon.uploader, 'SVG Repo');
  assert.equal(icon.downloadUrl, 'https://www.svgrepo.com/download/384415/database-storage.svg');
});

test('normalizes ids and icon URLs but rejects unrelated hosts', () => {
  assert.equal(normalizeIconRef('384415/database-storage'), 'https://www.svgrepo.com/svg/384415/database-storage');
  assert.equal(normalizeIconRef('https://www.svgrepo.com/svg/384415/database-storage?x=1'), 'https://www.svgrepo.com/svg/384415/database-storage');
  assert.throws(() => normalizeIconRef('https://example.com/svg/1/x'), /SVG Repo/);
});

test('builds style search URLs and public download URL', () => {
  assert.equal(buildSearchUrl('data base', 'outlined'), 'https://www.svgrepo.com/vectors/data-base/outlined/');
  assert.equal(downloadUrlFor('https://www.svgrepo.com/svg/384415/database-storage'), 'https://www.svgrepo.com/download/384415/database-storage.svg');
});
