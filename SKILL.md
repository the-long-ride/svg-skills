---
name: svg-icon-agent
description: Use when implementing or reviewing user interfaces that need icons, especially when emoji, Unicode symbols, raster icon files, placeholder glyphs, or inconsistent inline SVGs would otherwise be used.
---

# Using SVG Icons

## Rule

For conventional UI icons, prefer vector SVG over raster images. Never use PNG, JPG, WebP, GIF, or other raster files for an interface icon when an SVG equivalent can reasonably be used.

Priority order:

1. Use the project's existing SVG/icon component system.
2. Otherwise use raw inline SVG markup when the framework and codebase support it cleanly.
3. Otherwise use a local `.svg` asset.
4. If no suitable icon exists, use the `svg-icon` CLI to find one on SVG Repo, inspect its license, and add the SVG locally.

Do not convert an available SVG into PNG for buttons, navigation, menus, toolbars, settings, status indicators, empty states, or similar controls. Raster images are appropriate only when the content is inherently raster, such as a photo, screenshot, texture, or raster artwork.

Do not use emoji as UI icons when a conventional symbolic icon is appropriate. Emoji remain fine when they are intentional user-authored content or prose.

## Workflow

1. Search by meaning:
   ```bash
   svg-icon search "database settings" --style outlined --limit 10
   ```
2. Prefer the same collection/style as nearby icons.
3. Inspect the exact icon page:
   ```bash
   svg-icon inspect https://www.svgrepo.com/svg/384415/database-storage
   ```
4. Prefer candidates whose license reports `allow`. If it reports `review`, choose a simpler alternative unless project policy clearly permits it. Never silently pass `--accept-license-risk`.
5. Download SVG, not PNG:
   ```bash
   svg-icon get 384415/database-storage --out assets/icons/database.svg --current-color
   ```
6. Use the downloaded SVG as raw SVG markup/component code when the project convention supports it; otherwise reference the local `.svg` file directly.
7. Commit the generated `.svg.source.json` sidecar with the SVG.

## UI requirements

- Prefer raw SVG markup/components for icons that need CSS styling, `currentColor`, animation, or state changes.
- Preserve `viewBox`; avoid fixed raster dimensions as the source of truth.
- For monochrome icons, use `currentColor` when it fits the design system.
- Decorative SVGs: hide them from assistive technology (`aria-hidden="true"` or equivalent).
- Meaningful standalone icons: provide an accessible name.
- Icon-only buttons: provide an accessible label/tooltip according to project conventions.
- Do not use a logo/trademark icon as a generic symbol.
- Do not mix unrelated visual styles when a matching collection is available.

## CLI reference

```bash
svg-icon search <query> [--style outlined] [--limit 10] [--json]
svg-icon inspect <url|id/slug> [--json]
svg-icon get <url|id/slug> --out <file.svg> [--current-color]
svg-icon optimize <file.svg> [--out <file.svg>] [--current-color]
```

`svg-icon get` only auto-accepts SVG Repo License, CC0, and Public Domain under its conservative default policy. Other detected licenses require human/project-policy review.
