import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PublicHttpClient, assertPublicSvgRepoUrl, cacheFileName } from '../src/http.js';

test('rejects private API and non-SVG-Repo network targets', () => {
  assert.doesNotThrow(() => assertPublicSvgRepoUrl('https://www.svgrepo.com/svg/384415/database-storage'));
  assert.doesNotThrow(() => assertPublicSvgRepoUrl('https://www.svgrepo.com/download/384415/database-storage.svg'));
  assert.throws(() => assertPublicSvgRepoUrl('https://www.svgrepo.com/api/search?q=x'), /private API/i);
  assert.throws(() => assertPublicSvgRepoUrl('https://example.com/x'), /SVG Repo/i);
  assert.throws(() => assertPublicSvgRepoUrl('http://www.svgrepo.com/svg/1/x'), /HTTPS/i);
});

test('cache filename is deterministic and safe', () => {
  const a = cacheFileName('https://www.svgrepo.com/vectors/database/');
  const b = cacheFileName('https://www.svgrepo.com/vectors/database/');
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}\.cache$/);
});

test('GET uses fresh cache instead of requesting twice', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'svg-icon-agent-'));
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    return { ok: true, status: 200, text: async () => '<html>ok</html>' } as any;
  };
  try {
    const client = new PublicHttpClient({ cacheDir, cacheTtlMs: 60_000, minIntervalMs: 0, fetchImpl: fakeFetch as any });
    const url = 'https://www.svgrepo.com/vectors/database/';
    assert.equal(await client.getText(url), '<html>ok</html>');
    assert.equal(await client.getText(url), '<html>ok</html>');
    assert.equal(calls, 1);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
