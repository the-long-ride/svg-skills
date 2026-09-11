# SVG Icon Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free TypeScript CLI plus portable agent skill for discovering, licensing, downloading, and sanitizing SVG Repo icons.

**Architecture:** Pure parsing/policy modules are tested against fixtures. A throttled cached HTTP client handles public SVG Repo requests. The CLI composes these modules and writes sidecar provenance metadata for downloaded icons.

**Tech Stack:** Node.js 20+, TypeScript 5.8+, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-11-svg-icon-agent-design.md`

## Global Constraints
- No SVG Repo ownership or affiliation claim.
- Public pages/download URLs only; no private API endpoints.
- Minimum one-second network spacing and local cache.
- No bulk mirroring.
- Per-icon license inspection before download.
- Runtime dependencies: zero.

---

### Task 1: Parsing and license policy
**Files:** Create `src/svgrepo.ts`, `src/license.ts`; Test `test/svgrepo.test.ts`, `test/license.test.ts`.
**Produces:** search-page parser, icon-page parser, canonical URL normalization, license assessment.
- [ ] Write fixture-driven failing tests.
- [ ] Run tests and verify missing-module failure.
- [ ] Implement minimal parsing and policy.
- [ ] Run tests to green.

### Task 2: SVG sanitization
**Files:** Create `src/svg.ts`; Test `test/svg.test.ts`.
**Produces:** `sanitizeSvg(svg, currentColor)` removing scripts/event handlers/external hrefs and optionally normalizing monochrome paint.
- [ ] Write failing sanitizer tests.
- [ ] Verify red.
- [ ] Implement sanitizer.
- [ ] Verify green.

### Task 3: HTTP/cache and CLI
**Files:** Create `src/http.ts`, `src/cli.ts`; Test `test/http.test.ts` where pure cache behavior is testable.
**Produces:** throttled fetch/cache and four CLI commands.
- [ ] Write tests for cache keys/age and download URL behavior.
- [ ] Verify red.
- [ ] Implement HTTP and CLI composition.
- [ ] Verify all tests.

### Task 4: Skill, adapters, and documentation
**Files:** Create `SKILL.md`, `README.md`, `adapters/CLAUDE.md`, `adapters/AGENTS.md`, `adapters/GEMINI.md`, `LICENSE`.
**Produces:** installable cross-agent instructions and usage docs.
- [ ] Add concise trigger-focused skill frontmatter.
- [ ] Document CLI installation, commands, provider/legal boundaries, and integration paths.
- [ ] Run `npm run check` and inspect help output.


### Task 5: Cross-agent skill installer
**Files:** Create `src/skill-install.ts`; modify `src/cli.ts`, `README.md`, `package.json`; test `test/skill-install.test.ts`, `test/cli.test.ts`.
**Produces:** canonical `~/.agents/skills/svg-icon-agent` install plus safe links/junctions for agent-specific global skill paths.
- [x] Write failing tests for canonical path, target mapping, linking, collision safety, status, uninstall, and CLI parsing.
- [x] Verify red before implementation.
- [x] Implement cross-platform skill management using Node built-ins only.
- [x] Verify all tests green.
- [x] Run packaged CLI end-to-end against an isolated temporary home.
- [x] Pack and verify distributable artifacts.


### Task 6: Codex metadata, Pi, and OpenCode
**Files:** Create `agents/openai.yaml`, `adapters/CODEX.md`, `adapters/PI.md`, `adapters/OPENCODE.md`; modify `SKILL.md`, `src/skill-install.ts`, `src/cli.ts`, `README.md`, `package.json`; test `test/skill-install.test.ts`, `test/skill.test.ts`, `test/cli.test.ts`.
**Produces:** Codex product metadata plus first-class native integration reporting for Pi and OpenCode.
- [x] Write failing tests for Pi/OpenCode targets, Codex metadata installation, and portable skill naming.
- [x] Verify red before implementation.
- [x] Add `agents/openai.yaml` and copy it into the canonical skill package.
- [x] Add Pi/OpenCode as native `~/.agents/skills` readers.
- [x] Align skill frontmatter name with the canonical directory.
- [x] Update adapters and documentation.
