import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../src/cli.js';
import { mkdtemp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('parses search options', () => {
  assert.deepEqual(parseCliArgs(['search', 'settings panel', '--style', 'outlined', '--limit', '5', '--json']), {
    command: 'search', query: 'settings panel', style: 'outlined', limit: 5, json: true
  });
});

test('parses get and optimize options', () => {
  assert.deepEqual(parseCliArgs(['get', '384415/database-storage', '--out', 'icons/db.svg', '--current-color', '--accept-license-risk']), {
    command: 'get', ref: '384415/database-storage', out: 'icons/db.svg', currentColor: true, acceptLicenseRisk: true
  });
  assert.deepEqual(parseCliArgs(['optimize', 'icon.svg', '--out', 'clean.svg', '--current-color']), {
    command: 'optimize', file: 'icon.svg', out: 'clean.svg', currentColor: true
  });
});

test('rejects unsupported commands and malformed numeric options', () => {
  assert.throws(() => parseCliArgs(['search', 'x', '--limit', '0']), /limit/i);
  assert.throws(() => parseCliArgs(['wat']), /Unknown command/i);
});

test('parses skill management commands', () => {
  assert.deepEqual(parseCliArgs(['skill', 'install']), { command: 'skill', action: 'install', agents: ['all'] });
  assert.deepEqual(parseCliArgs(['skill', 'install', '--agents', 'claude,codex,pi,opencode']), { command: 'skill', action: 'install', agents: ['claude', 'codex', 'pi', 'opencode'] });
  assert.deepEqual(parseCliArgs(['skill', 'link', 'claude']), { command: 'skill', action: 'link', agents: ['claude'] });
  assert.deepEqual(parseCliArgs(['skill', 'link', 'all']), { command: 'skill', action: 'link', agents: ['all'] });
  assert.deepEqual(parseCliArgs(['skill', 'status']), { command: 'skill', action: 'status', agents: ['all'] });
  assert.deepEqual(parseCliArgs(['skill', 'uninstall']), { command: 'skill', action: 'uninstall', agents: ['all'] });
});

test('rejects unknown skill agents and actions', () => {
  assert.throws(() => parseCliArgs(['skill', 'link', 'unknown-agent']), /agent/i);
  assert.throws(() => parseCliArgs(['skill', 'wat']), /skill action/i);
});

test('CLI runs when invoked through a symlink such as an npm global bin', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'svg-icon-cli-link-'));
  const link = join(dir, 'svg-icon.js');
  await symlink(resolve('dist/src/cli.js'), link);
  const result = spawnSync(process.execPath, [link, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /svg-icon — discover licensed SVG Repo icons/);
});
