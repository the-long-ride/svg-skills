import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readlink, lstat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  agentTargets,
  canonicalSkillPath,
  installSkill,
  linkSkill,
  skillStatus,
  uninstallSkill,
} from '../src/skill-install.js';

async function fixtureHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'svg-icon-agent-home-'));
}

const skillText = '---\nname: svg-icon-agent\ndescription: test\n---\n# Skill\n';
const openAiYamlText = 'interface:\n  display_name: "SVG Icon Agent"\n  short_description: "Find licensed SVG icons for UI work"\n  default_prompt: "Use $svg-icon-agent to add a proper SVG icon."\npolicy:\n  allow_implicit_invocation: true\n';

test('canonical skill lives under ~/.agents/skills/svg-icon-agent', () => {
  assert.equal(canonicalSkillPath('/home/tester'), '/home/tester/.agents/skills/svg-icon-agent');
});

test('agent targets distinguish native readers from link targets', () => {
  const targets = agentTargets('/home/tester');
  assert.equal(targets.codex.mode, 'native');
  assert.equal(targets.gemini.mode, 'native');
  assert.equal(targets.pi.mode, 'native');
  assert.equal(targets.opencode.mode, 'native');
  assert.equal(targets.claude.path, '/home/tester/.claude/skills/svg-icon-agent');
  assert.equal(targets.antigravity.path, '/home/tester/.gemini/antigravity/skills/svg-icon-agent');
  assert.equal(targets['antigravity-cli'].path, '/home/tester/.gemini/antigravity-cli/skills/svg-icon-agent');
});

test('install writes one canonical copy and links compatibility targets', async () => {
  const home = await fixtureHome();
  const result = await installSkill({ home, platform: 'linux', skillText, openAiYamlText, agents: ['all'] });
  const canonical = canonicalSkillPath(home);

  assert.equal(await readFile(join(canonical, 'SKILL.md'), 'utf8'), skillText);
  assert.equal(await readFile(join(canonical, 'agents', 'openai.yaml'), 'utf8'), openAiYamlText);
  assert.equal(result.canonical, canonical);
  assert.equal(result.agents.codex!.status, 'native');
  assert.equal(result.agents.gemini!.status, 'native');
  assert.equal(result.agents.pi!.status, 'native');
  assert.equal(result.agents.opencode!.status, 'native');

  for (const name of ['claude', 'antigravity', 'antigravity-cli'] as const) {
    const target = agentTargets(home)[name].path!;
    assert.equal((await lstat(target)).isSymbolicLink(), true);
    assert.equal(await readlink(target), canonical);
    assert.equal(result.agents[name]!.status, 'linked');
  }
});

test('link refuses to replace an existing real directory', async () => {
  const home = await fixtureHome();
  const canonical = canonicalSkillPath(home);
  await mkdir(canonical, { recursive: true });
  await writeFile(join(canonical, 'SKILL.md'), skillText, 'utf8');
  const target = agentTargets(home).claude.path!;
  await mkdir(target, { recursive: true });

  await assert.rejects(
    () => linkSkill('claude', { home, platform: 'linux' }),
    /already exists/i,
  );
});

test('status reports missing, canonical, linked, and native states', async () => {
  const home = await fixtureHome();
  let status = await skillStatus({ home, platform: 'linux' });
  assert.equal(status.canonical.status, 'missing');
  assert.equal(status.agents.claude.status, 'missing');
  assert.equal(status.agents.codex.status, 'native-missing');

  await installSkill({ home, platform: 'linux', skillText, openAiYamlText, agents: ['claude'] });
  status = await skillStatus({ home, platform: 'linux' });
  assert.equal(status.canonical.status, 'installed');
  assert.equal(status.agents.claude.status, 'linked');
  assert.equal(status.agents.codex.status, 'native');
});

test('uninstall removes managed links and canonical copy', async () => {
  const home = await fixtureHome();
  await installSkill({ home, platform: 'linux', skillText, openAiYamlText, agents: ['all'] });
  await uninstallSkill({ home, platform: 'linux', agents: ['all'] });

  const status = await skillStatus({ home, platform: 'linux' });
  assert.equal(status.canonical.status, 'missing');
  assert.equal(status.agents.claude.status, 'missing');
  assert.equal(status.agents.antigravity.status, 'missing');
});
