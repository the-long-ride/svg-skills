import { lstat, mkdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';

export type AgentName = 'claude' | 'codex' | 'gemini' | 'pi' | 'opencode' | 'antigravity' | 'antigravity-cli';
export type AgentSelection = AgentName | 'all';

type AgentTarget = {
  mode: 'native' | 'link';
  path?: string;
  note: string;
};

export type AgentInstallState = {
  status: 'native' | 'native-missing' | 'linked' | 'missing' | 'occupied' | 'foreign-link';
  path: string;
  target?: string;
};

export type SkillStatus = {
  canonical: { status: 'installed' | 'missing'; path: string };
  agents: Record<AgentName, AgentInstallState>;
};

type SkillFsOptions = {
  home: string;
  platform: string;
};

type InstallOptions = SkillFsOptions & {
  skillText: string;
  openAiYamlText: string;
  agents: AgentSelection[];
};

type UninstallOptions = SkillFsOptions & {
  agents: AgentSelection[];
};

const AGENT_NAMES: AgentName[] = ['claude', 'codex', 'gemini', 'pi', 'opencode', 'antigravity', 'antigravity-cli'];

export function canonicalSkillPath(home: string): string {
  return join(home, '.agents', 'skills', 'svg-icon-agent');
}

export function agentTargets(home: string): Record<AgentName, AgentTarget> {
  return {
    claude: {
      mode: 'link',
      path: join(home, '.claude', 'skills', 'svg-icon-agent'),
      note: 'Claude Code user skill path',
    },
    codex: {
      mode: 'native',
      note: 'Codex reads ~/.agents/skills directly',
    },
    gemini: {
      mode: 'native',
      note: 'Gemini CLI supports ~/.agents/skills as a user-skill alias',
    },
    pi: {
      mode: 'native',
      note: 'Pi discovers ~/.agents/skills directly',
    },
    opencode: {
      mode: 'native',
      note: 'OpenCode discovers ~/.agents/skills directly',
    },
    antigravity: {
      mode: 'link',
      path: join(home, '.gemini', 'antigravity', 'skills', 'svg-icon-agent'),
      note: 'Antigravity IDE global skill path',
    },
    'antigravity-cli': {
      mode: 'link',
      path: join(home, '.gemini', 'antigravity-cli', 'skills', 'svg-icon-agent'),
      note: 'Antigravity CLI global skill path',
    },
  };
}

export function supportedAgentNames(): AgentName[] {
  return [...AGENT_NAMES];
}

function expandAgents(agents: AgentSelection[]): AgentName[] {
  if (agents.includes('all')) return [...AGENT_NAMES];
  return [...new Set(agents)] as AgentName[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function isCanonicalInstalled(home: string): Promise<boolean> {
  return exists(join(canonicalSkillPath(home), 'SKILL.md'));
}

function normalizeLinkTarget(linkPath: string, value: string): string {
  return normalize(resolve(dirname(linkPath), value));
}

export async function linkSkill(
  agent: AgentName,
  options: SkillFsOptions,
): Promise<AgentInstallState> {
  const canonical = canonicalSkillPath(options.home);
  if (!(await isCanonicalInstalled(options.home))) {
    throw new Error(`Canonical skill is not installed at ${canonical}. Run "svg-icon skill install" first.`);
  }

  const target = agentTargets(options.home)[agent];
  if (target.mode === 'native') {
    return { status: 'native', path: canonical, target: canonical };
  }

  const linkPath = target.path!;
  if (await exists(linkPath)) {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) {
      throw new Error(`${linkPath} already exists and is not a managed link; refusing to replace it.`);
    }
    const current = normalizeLinkTarget(linkPath, await readlink(linkPath));
    if (current === normalize(canonical)) {
      return { status: 'linked', path: linkPath, target: canonical };
    }
    throw new Error(`${linkPath} already exists and points somewhere else; refusing to replace it.`);
  }

  await mkdir(dirname(linkPath), { recursive: true });
  await symlink(canonical, linkPath, options.platform === 'win32' ? 'junction' : 'dir');
  return { status: 'linked', path: linkPath, target: canonical };
}

export async function installSkill(options: InstallOptions): Promise<{
  canonical: string;
  agents: Partial<Record<AgentName, AgentInstallState>>;
}> {
  const canonical = canonicalSkillPath(options.home);
  await mkdir(canonical, { recursive: true });
  await writeFile(join(canonical, 'SKILL.md'), options.skillText, 'utf8');
  const agentsDir = join(canonical, 'agents');
  await mkdir(agentsDir, { recursive: true });
  await writeFile(join(agentsDir, 'openai.yaml'), options.openAiYamlText, 'utf8');

  const agents: Partial<Record<AgentName, AgentInstallState>> = {};
  for (const agent of expandAgents(options.agents)) {
    agents[agent] = await linkSkill(agent, options);
  }
  return { canonical, agents };
}

async function inspectAgent(agent: AgentName, options: SkillFsOptions, canonicalInstalled: boolean): Promise<AgentInstallState> {
  const canonical = canonicalSkillPath(options.home);
  const target = agentTargets(options.home)[agent];
  if (target.mode === 'native') {
    return {
      status: canonicalInstalled ? 'native' : 'native-missing',
      path: canonical,
      target: canonical,
    };
  }

  const linkPath = target.path!;
  if (!(await exists(linkPath))) return { status: 'missing', path: linkPath, target: canonical };

  const stat = await lstat(linkPath);
  if (!stat.isSymbolicLink()) return { status: 'occupied', path: linkPath, target: canonical };

  const rawTarget = await readlink(linkPath);
  const resolvedTarget = normalizeLinkTarget(linkPath, rawTarget);
  return {
    status: resolvedTarget === normalize(canonical) ? 'linked' : 'foreign-link',
    path: linkPath,
    target: rawTarget,
  };
}

export async function skillStatus(options: SkillFsOptions): Promise<SkillStatus> {
  const canonical = canonicalSkillPath(options.home);
  const canonicalInstalled = await isCanonicalInstalled(options.home);
  const agents = {} as Record<AgentName, AgentInstallState>;
  for (const agent of AGENT_NAMES) agents[agent] = await inspectAgent(agent, options, canonicalInstalled);
  return {
    canonical: { status: canonicalInstalled ? 'installed' : 'missing', path: canonical },
    agents,
  };
}

async function removeManagedLink(agent: AgentName, options: SkillFsOptions): Promise<void> {
  const canonical = canonicalSkillPath(options.home);
  const target = agentTargets(options.home)[agent];
  if (target.mode === 'native' || !target.path || !(await exists(target.path))) return;

  const stat = await lstat(target.path);
  if (!stat.isSymbolicLink()) return;
  const resolvedTarget = normalizeLinkTarget(target.path, await readlink(target.path));
  if (resolvedTarget === normalize(canonical)) await rm(target.path, { force: true, recursive: true });
}

export async function uninstallSkill(options: UninstallOptions): Promise<void> {
  const selected = expandAgents(options.agents);
  for (const agent of selected) await removeManagedLink(agent, options);
  if (options.agents.includes('all')) {
    await rm(canonicalSkillPath(options.home), { force: true, recursive: true });
  }
}

export async function readInstalledSkill(home: string): Promise<string | undefined> {
  try {
    return await readFile(join(canonicalSkillPath(home), 'SKILL.md'), 'utf8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}
