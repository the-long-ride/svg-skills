# svg-icon-agent

Portable Agent Skill + dependency-free TypeScript CLI for discovering SVG Repo icons instead of using emoji as UI iconography.

This project is independent of SVG Repo and is not affiliated with, endorsed by, or owned by SVG Repo LLC.

## What it does

- Searches public SVG Repo vector pages.
- Inspects the individual icon page for license, collection, uploader, and download metadata.
- Downloads a local SVG only after license inspection.
- Sanitizes active SVG content and optionally converts monochrome paint to `currentColor`.
- Writes `<icon>.svg.source.json` beside downloaded assets for provenance.
- Uses a 1-second minimum request interval and local page cache.
- Refuses SVG Repo `/api/` endpoints.
- Gives coding agents a reusable `SKILL.md` rule: use conventional SVG icons instead of emoji UI controls.
- Prioritizes raw inline SVG or local `.svg` assets over PNG/JPG/WebP raster icons for UI glyphs.

## Requirements

- Node.js 20+
- TypeScript is only needed to build from source. The compiled CLI has zero runtime dependencies.

## Build and install CLI

```bash
npm install
npm run build
npm install -g .
svg-icon --help
```

For development in this repository:

```bash
npm test
npm run check
```

## CLI

```bash
svg-icon search "settings" --style outlined
svg-icon search "database" --limit 5 --json

svg-icon inspect https://www.svgrepo.com/svg/384415/database-storage
svg-icon inspect 384415/database-storage --json

svg-icon get 384415/database-storage \
  --out assets/icons/database.svg \
  --current-color

svg-icon optimize assets/icons/database.svg --current-color
```

### License gate

The CLI intentionally uses a conservative policy:

| Detected license | Default |
|---|---|
| SVG Repo License | allow |
| CC0 | allow |
| Public Domain | allow |
| MIT / Apache / CC BY / GPL / MPL / OFL | review |
| CC BY-NC | review |
| Logo / trademark terms | review |
| Unknown | review |

`review` does not mean the license is forbidden. It means the CLI will not make the legal/project-policy decision automatically. After reviewing the individual icon's terms, `--accept-license-risk` can override the gate.

## Install the skill

The CLI keeps one canonical skill package at:

```text
~/.agents/skills/svg-icon-agent/
├── SKILL.md
└── agents/
    └── openai.yaml
```

`agents/openai.yaml` provides Codex-specific interface metadata and invocation policy. Other agents can ignore it.

Install it and wire all supported agents in one command:

```bash
svg-icon skill install
```

Default behavior:

- Writes/updates the canonical copy under `~/.agents/skills/svg-icon-agent`.
- Codex uses the canonical `.agents/skills` location directly and reads `agents/openai.yaml`.
- Gemini CLI uses the canonical `.agents/skills` alias directly.
- Pi uses the canonical `.agents/skills` location directly.
- OpenCode uses the canonical `.agents/skills` location directly.
- Claude Code gets a link at `~/.claude/skills/svg-icon-agent`.
- Antigravity IDE gets a link at `~/.gemini/antigravity/skills/svg-icon-agent`.
- Antigravity CLI gets a link at `~/.gemini/antigravity-cli/skills/svg-icon-agent`.
- Linux/macOS use directory symlinks. Windows uses directory junctions so Developer Mode/elevation is not required in normal setups.
- Existing real directories or foreign links are never overwritten.

### Skill management commands

```bash
svg-icon skill install
svg-icon skill install --agents claude,codex,pi,opencode,antigravity
svg-icon skill install --all

svg-icon skill link claude
svg-icon skill link pi              # reports native; no duplicate link needed
svg-icon skill link opencode        # reports native; no duplicate link needed
svg-icon skill link antigravity
svg-icon skill link antigravity-cli
svg-icon skill link all

svg-icon skill status

svg-icon skill uninstall
svg-icon skill uninstall --agents claude
```

`skill install` defaults to all supported agents. Native agents report `native` rather than receiving a redundant link.

`skill uninstall` with no arguments (or `--all`) removes managed links and the canonical skill. With `--agents`, it removes only those managed links and leaves the canonical skill installed.

Example status:

```text
svg-icon-agent

Canonical: ✓ ~/.agents/skills/svg-icon-agent

Agents:
✓ claude           linked → ~/.agents/skills/svg-icon-agent
✓ codex            native
✓ gemini           native
✓ pi               native
✓ opencode         native
✓ antigravity      linked → ~/.agents/skills/svg-icon-agent
✓ antigravity-cli  linked → ~/.agents/skills/svg-icon-agent
```

After installation, restart/reload the coding agent so it re-indexes available skills.

### Agent-specific discovery

| Agent | Integration |
|---|---|
| Codex | Native `~/.agents/skills`; uses `agents/openai.yaml` for Codex UI/invocation metadata |
| Pi | Native `~/.agents/skills`; no symlink required |
| OpenCode | Native `~/.agents/skills`; no symlink required |
| Gemini CLI | Native `~/.agents/skills` compatibility path |
| Claude Code | Symlink/junction from `~/.claude/skills/svg-icon-agent` |
| Antigravity | Symlink/junction from its global skill directory |

The canonical directory remains the only managed copy, so upgrades update every native reader and linked agent together.

### SVG-over-raster policy

For interface glyphs and controls, the skill uses this priority:

1. Existing project SVG/icon component system.
2. Raw inline SVG markup when the project supports it cleanly.
3. Local `.svg` asset.
4. SVG Repo discovery through `svg-icon` when no suitable icon exists.

PNG/JPG/WebP/GIF icons are not used when an SVG equivalent is reasonably available. Raster formats remain valid for photos, screenshots, textures, and inherently raster artwork.

## Network behavior

The CLI only permits HTTPS requests to `svgrepo.com` / `www.svgrepo.com` and explicitly rejects `/api/` paths. It caches public HTML pages for 24 hours and spaces uncached requests by at least 1 second. It is intended for task-driven icon discovery, not catalogue mirroring or bulk crawling.

Cache location defaults to:

```text
~/.svg-icon-agent/cache
```

Override it with `SVG_ICON_CACHE_DIR`.

## SVG safety

The sanitizer removes scripts, `foreignObject`, iframe/object/embed content, inline event handlers, style blocks, dangerous style URLs/expressions, and external/data/javascript href references. It is intentionally small and dependency-free; keep browser CSP and normal application security controls in place.

## Thanks to SVG Repo

Thanks to [SVG Repo](https://www.svgrepo.com/) for providing a large, accessible collection of SVG icons that makes this project possible. This project is independent of and not affiliated with or endorsed by SVG Repo.

## Third-party licensing

The MIT license in this repository applies to this tool's source code only. SVG files downloaded from SVG Repo retain their own license. Keep each generated `.source.json` file and review the icon page when a project's licensing requirements demand it.
