import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('skill has discoverable frontmatter and icon-over-emoji rule', async () => {
  const text = await readFile(new URL('file://' + process.cwd() + '/SKILL.md'), 'utf8');
  assert.match(text, /^---\nname: svg-icon-agent\ndescription: Use when /);
  assert.match(text, /Do not use emoji as UI icons/i);
  assert.match(text, /svg-icon search/);
  assert.match(text, /svg-icon inspect/);
  assert.match(text, /svg-icon get/);
  assert.match(text, /license/i);
  assert.match(text, /accessib/i);
  assert.match(text, /raw (?:inline )?SVG|raw SVG markup/i);
  assert.match(text, /PNG.*(?:do not|never|avoid)|(?:do not|never|avoid).*PNG/i);
  assert.match(text, /raster.*(?:photo|screenshot|artwork)/i);
});

test('Codex metadata exists under agents/openai.yaml and references the skill', async () => {
  const text = await readFile(new URL('file://' + process.cwd() + '/agents/openai.yaml'), 'utf8');
  assert.match(text, /display_name: \"SVG Icon Agent\"/);
  assert.match(text, /short_description:/);
  assert.match(text, /default_prompt: \"Use \$svg-icon-agent /);
  assert.match(text, /allow_implicit_invocation: true/);
  assert.match(text, /raw SVG.*(?:PNG|raster)|(?:PNG|raster).*raw SVG/i);
});
