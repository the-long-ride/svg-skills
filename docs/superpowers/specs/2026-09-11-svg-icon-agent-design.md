# SVG Icon Agent Design

## Goal
Provide coding agents with a portable skill and CLI that discovers SVG Repo icons for UI work, validates per-icon licensing, downloads local copies, and avoids emoji as substitute UI iconography.

## Boundaries
- SVG Repo is an independent external provider; this project has no affiliation or ownership claim.
- Use public web pages and public SVG download URLs only; never private/internal API endpoints.
- Respect a minimum one-second interval between network requests and cache fetched pages locally.
- Do not bulk mirror or crawl the SVG Repo catalogue.
- Inspect each icon's page and preserve source URL plus license metadata before project use.

## CLI
`svg-icon search <query> [--style <style>] [--limit N] [--json]`
`svg-icon inspect <url-or-id> [--json]`
`svg-icon get <url-or-id> --out <path> [--accept-license-risk] [--current-color]`
`svg-icon optimize <file> [--out <path>] [--current-color]`

## License policy
Automatically allow low-friction licenses: SVG Repo License, CC0, and Public Domain. Licenses with attribution, copyleft, non-commercial, logo/trademark, or unknown obligations require explicit `--accept-license-risk` after displaying the detected license and source.

## Download policy
Derive the documented public download URL from the canonical icon page `/svg/<id>/<slug>` as `/download/<id>/<slug>.svg`. Sanitize active content before writing. Save `<icon>.svg.source.json` with source, license, collection, uploader, and retrieval timestamp.

## Agent behavior
When a normal symbolic UI icon is needed, agents should search SVG Repo rather than insert emoji. Prefer icons from one collection/style, use local assets rather than hotlinks, preserve accessible text/labels, and do not replace meaningful text with an unlabeled icon.

## Portability
Primary skill follows the Agent Skills `SKILL.md` convention with a matching `svg-icon-agent` directory/frontmatter ID. The package includes `agents/openai.yaml` for Codex-specific interface metadata. Pi and OpenCode consume the canonical `~/.agents/skills` directory natively; small adapters cover Claude Code, Codex, Pi, OpenCode, Gemini CLI, and Antigravity.


## Skill installation architecture
The CLI owns one canonical skill copy at `~/.agents/skills/svg-icon-agent`. Codex, Pi, OpenCode, and other agents that natively discover `~/.agents/skills` use it directly. Agent-specific global skill locations receive a filesystem link to the canonical directory, avoiding duplicated skill copies and making upgrades atomic from one source. Linux/macOS use directory symlinks; Windows uses directory junctions. Existing non-managed directories and foreign links are never overwritten.
