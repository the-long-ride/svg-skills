#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { PublicHttpClient } from './http.js';
import { assessLicense } from './license.js';
import { sanitizeSvg } from './svg.js';
import { buildSearchUrl, normalizeIconRef, parseIconPage, parseSearchPage } from './svgrepo.js';
import { installSkill, linkSkill, skillStatus, supportedAgentNames, uninstallSkill, type AgentName, type AgentSelection } from './skill-install.js';

export type CliCommand =
  | { command: 'search'; query: string; style: string; limit: number; json: boolean }
  | { command: 'inspect'; ref: string; json: boolean }
  | { command: 'get'; ref: string; out: string; currentColor: boolean; acceptLicenseRisk: boolean }
  | { command: 'optimize'; file: string; out?: string; currentColor: boolean }
  | { command: 'skill'; action: 'install' | 'uninstall' | 'status' | 'link'; agents: AgentSelection[] }
  | { command: 'help' };

function takeValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseAgents(value: string): AgentSelection[] {
  const values = value.split(',').map(v => v.trim()).filter(Boolean);
  if (values.length === 0) throw new Error('--agents requires at least one agent.');
  const supported = new Set([...supportedAgentNames(), 'all']);
  for (const agent of values) if (!supported.has(agent as AgentSelection)) throw new Error(`Unknown agent: ${agent}`);
  return values as AgentSelection[];
}

export function parseCliArgs(argv: string[]): CliCommand {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') return { command: 'help' };
  const command = argv[0];
  if (command === 'skill') {
    const action = argv[1];
    if (!action || !['install', 'uninstall', 'status', 'link'].includes(action)) throw new Error(`Unknown skill action: ${action ?? '(missing)'}`);
    if (action === 'status') {
      if (argv.length > 2) throw new Error(`Unknown option for skill status: ${argv[2]}`);
      return { command: 'skill', action: 'status', agents: ['all'] };
    }
    if (action === 'link') {
      const agent = argv[2];
      if (!agent) throw new Error('skill link requires an agent name or all.');
      if (argv.length > 3) throw new Error(`Unknown option for skill link: ${argv[3]}`);
      return { command: 'skill', action: 'link', agents: parseAgents(agent) };
    }
    let agents: AgentSelection[] = ['all'];
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === '--agents') { agents = parseAgents(takeValue(argv, i, '--agents')); i++; }
      else if (argv[i] === '--all') agents = ['all'];
      else throw new Error(`Unknown option for skill ${action}: ${argv[i]}`);
    }
    return { command: 'skill', action: action as 'install' | 'uninstall', agents };
  }
  if (command === 'search') {
    const query = argv[1];
    if (!query || query.startsWith('--')) throw new Error('search requires a query.');
    let style = 'all', limit = 10, json = false;
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === '--style') { style = takeValue(argv, i, '--style'); i++; }
      else if (argv[i] === '--limit') { limit = Number(takeValue(argv, i, '--limit')); i++; }
      else if (argv[i] === '--json') json = true;
      else throw new Error(`Unknown option for search: ${argv[i]}`);
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('--limit must be an integer from 1 to 50.');
    return { command: 'search', query, style, limit, json };
  }
  if (command === 'inspect') {
    const ref = argv[1];
    if (!ref || ref.startsWith('--')) throw new Error('inspect requires an SVG Repo icon URL or id/slug.');
    let json = false;
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === '--json') json = true; else throw new Error(`Unknown option for inspect: ${argv[i]}`);
    }
    return { command: 'inspect', ref, json };
  }
  if (command === 'get') {
    const ref = argv[1];
    if (!ref || ref.startsWith('--')) throw new Error('get requires an SVG Repo icon URL or id/slug.');
    let out = '', currentColor = false, acceptLicenseRisk = false;
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === '--out') { out = takeValue(argv, i, '--out'); i++; }
      else if (argv[i] === '--current-color') currentColor = true;
      else if (argv[i] === '--accept-license-risk') acceptLicenseRisk = true;
      else throw new Error(`Unknown option for get: ${argv[i]}`);
    }
    if (!out) throw new Error('get requires --out <file.svg>.');
    return { command: 'get', ref, out, currentColor, acceptLicenseRisk };
  }
  if (command === 'optimize') {
    const file = argv[1];
    if (!file || file.startsWith('--')) throw new Error('optimize requires a local SVG file.');
    let out: string | undefined, currentColor = false;
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === '--out') { out = takeValue(argv, i, '--out'); i++; }
      else if (argv[i] === '--current-color') currentColor = true;
      else throw new Error(`Unknown option for optimize: ${argv[i]}`);
    }
    return { command: 'optimize', file, out, currentColor };
  }
  throw new Error(`Unknown command: ${command}`);
}

function help(): string {
  return `svg-icon — discover licensed SVG Repo icons for agent UI work\n\n` +
`Usage:\n` +
`  svg-icon search <query> [--style outlined] [--limit 10] [--json]\n` +
`  svg-icon inspect <url|id/slug> [--json]\n` +
`  svg-icon get <url|id/slug> --out <file.svg> [--current-color] [--accept-license-risk]\n` +
`  svg-icon optimize <file.svg> [--out <file.svg>] [--current-color]\n` +
`  svg-icon skill install [--agents claude,codex,... | --all]\n` +
`  svg-icon skill link <claude|codex|gemini|pi|opencode|antigravity|antigravity-cli|all>\n` +
`  svg-icon skill status\n` +
`  svg-icon skill uninstall [--agents ... | --all]\n\n` +
`Policy:\n` +
`  Uses public svgrepo.com pages/downloads only. No private API.\n` +
`  Network requests are cached and spaced by at least 1 second.\n` +
`  CC0/Public Domain/SVG Repo License auto-pass; other licenses require explicit review.\n`;
}

function formatSkillStatus(status: Awaited<ReturnType<typeof skillStatus>>): string {
  const lines = [
    'svg-icon-agent',
    '',
    `Canonical: ${status.canonical.status === 'installed' ? '✓' : '✗'} ${status.canonical.path}`,
    '',
    'Agents:',
  ];
  for (const [name, state] of Object.entries(status.agents)) {
    const mark = ['native', 'linked'].includes(state.status) ? '✓' : state.status === 'missing' || state.status === 'native-missing' ? '○' : '!';
    const suffix = state.status === 'native' ? 'native' : state.status === 'linked' ? `linked → ${state.target}` : state.status;
    lines.push(`${mark} ${name.padEnd(16)} ${suffix}`);
  }
  return lines.join('\n');
}

async function bundledSkillText(): Promise<string> {
  const path = new URL('../../SKILL.md', import.meta.url);
  return readFile(path, 'utf8');
}

async function bundledOpenAiYamlText(): Promise<string> {
  const path = new URL('../../agents/openai.yaml', import.meta.url);
  return readFile(path, 'utf8');
}

function printMetadata(meta: any, asJson: boolean): void {
  const assessment = assessLicense(meta.license);
  if (asJson) console.log(JSON.stringify({ ...meta, licenseAssessment: assessment }, null, 2));
  else {
    console.log(`${meta.title}\n${meta.url}\nLicense: ${meta.license} [${assessment.status}]\nCollection: ${meta.collection}\nUploader: ${meta.uploader}\nDownload: ${meta.downloadUrl}`);
  }
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(argv);
  if (parsed.command === 'help') { console.log(help()); return; }
  if (parsed.command === 'skill') {
    const options = { home: homedir(), platform: process.platform };
    if (parsed.action === 'status') {
      console.log(formatSkillStatus(await skillStatus(options)));
      return;
    }
    if (parsed.action === 'install') {
      const result = await installSkill({
        ...options,
        skillText: await bundledSkillText(),
        openAiYamlText: await bundledOpenAiYamlText(),
        agents: parsed.agents,
      });
      console.log(`Installed canonical skill: ${result.canonical}`);
      console.log(formatSkillStatus(await skillStatus(options)));
      return;
    }
    if (parsed.action === 'link') {
      const names = parsed.agents.includes('all') ? supportedAgentNames() : parsed.agents as AgentName[];
      for (const name of names) await linkSkill(name, options);
      console.log(formatSkillStatus(await skillStatus(options)));
      return;
    }
    await uninstallSkill({ ...options, agents: parsed.agents });
    console.log(formatSkillStatus(await skillStatus(options)));
    return;
  }
  const http = new PublicHttpClient();

  if (parsed.command === 'search') {
    const html = await http.getText(buildSearchUrl(parsed.query, parsed.style));
    const results = parseSearchPage(html, parsed.limit);
    if (parsed.json) console.log(JSON.stringify(results, null, 2));
    else results.forEach((item, i) => console.log(`${i + 1}. ${item.title}\n   ${item.url}`));
    return;
  }

  if (parsed.command === 'inspect' || parsed.command === 'get') {
    const pageUrl = normalizeIconRef(parsed.ref);
    const html = await http.getText(pageUrl);
    const meta = parseIconPage(html, pageUrl);
    if (parsed.command === 'inspect') { printMetadata(meta, parsed.json); return; }

    const assessment = assessLicense(meta.license);
    if (assessment.status === 'review' && !parsed.acceptLicenseRisk) {
      throw new Error(`License review required: ${meta.license}. ${assessment.reason} Re-run with --accept-license-risk only after reviewing the icon license/source.`);
    }
    const raw = await http.getText(meta.downloadUrl, false);
    const clean = sanitizeSvg(raw, parsed.currentColor);
    const out = resolve(parsed.out);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, clean, 'utf8');
    await writeFile(`${out}.source.json`, JSON.stringify({
      source: meta.url,
      downloadUrl: meta.downloadUrl,
      license: meta.license,
      collection: meta.collection,
      uploader: meta.uploader,
      retrievedAt: new Date().toISOString()
    }, null, 2) + '\n', 'utf8');
    console.log(`Saved ${out}\nSource metadata: ${out}.source.json`);
    return;
  }

  const input = await readFile(resolve(parsed.file), 'utf8');
  const clean = sanitizeSvg(input, parsed.currentColor);
  const out = resolve(parsed.out ?? parsed.file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, clean, 'utf8');
  console.log(`Saved ${out}`);
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli().catch((error: any) => { console.error(`svg-icon: ${error?.message ?? error}`); process.exitCode = 1; });
}
