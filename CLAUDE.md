# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

interlace.sh — marketing and documentation website for Interlace, a unified data pipeline framework for Python and SQL. Static site deployed to GitHub Pages.

## Tech Stack

- **Framework:** SvelteKit 5 with adapter-static (fully pre-rendered)
- **Language:** TypeScript (strict mode), Svelte 5
- **Styling:** Tailwind CSS 4 with CSS custom properties design system
- **Content:** MDsveX (Markdown in Svelte) for docs and blog posts
- **Package manager:** pnpm
- **Task runner:** moon (with proto managing tool versions)

## Toolchain

Tool versions are pinned in `.prototools` (moon, Node, pnpm) and installed with
[proto](https://moonrepo.dev/proto). One-time setup on a fresh clone:

```bash
proto install    # Installs moon, Node and pnpm at the pinned versions
```

moon downloads Node/pnpm and installs `node_modules` on demand, so `moon run` works
without a separate `pnpm install`.

## Commands

moon is the task runner; the project is registered as `site`. Pass extra args after `--`
(e.g. `moon run site:check -- --watch`).

```bash
moon run site:dev       # Start dev server
moon run site:build     # Build static site to /build
moon run site:preview   # Preview production build
moon run site:check     # Type-check with svelte-check
moon run site:lint      # Prettier check + ESLint
moon run site:format    # Auto-format with Prettier
```

Build/check/lint results are cached by moon and keyed on their declared inputs, so
repeat runs are near-instant when nothing changed.

The equivalent `pnpm` scripts in `package.json` are kept in sync and still work — moon
invokes the underlying binaries (`vite`, `svelte-check`, `prettier`) directly rather than
going through pnpm. Use the pnpm scripts to bypass moon's cache.

## Architecture

**Path aliases** (defined in svelte.config.js):

- `$components` → `src/lib/components`

**Component organization** (`src/lib/components/`):

- `layout/` — Header, Footer, Container
- `marketing/` — Home page sections (Hero, Comparison, Pipelines, etc.)
- `docs/` — DocsSidebar, TableOfContents, Pagination
- `blog/` — BlogCard, etc.

Each component directory uses barrel exports via `index.ts`.

**Routes** (`src/routes/`):

- `/` — Home page (assembles marketing components)
- `/why/` — Comparison against dbt, SQLMesh and Airflow
- `/blog/` — Listing, plus one directory per post (`blog/<slug>/+page.md`)
- `/docs/` — Documentation with nested sections (getting-started, core-concepts, guides, reference)

**Content authoring:** Documentation and blog posts are `.md` files processed by MDsveX.

- Blog posts need `title`, `date` (quoted, so it stays a string) and `excerpt` in frontmatter. `blog/+page.ts` globs the posts and builds the listing from that frontmatter, sorted by date — nothing to register by hand.
- Docs sidebar navigation is still hardcoded in DocsSidebar.svelte, so a new docs page needs an entry there.

**Accuracy:** Claims about Interlace behaviour must be verified against the `interlace` source at `../interlace` (CLI via `uv run interlace --help`, `@model` signature in `src/interlace/dsl/decorators.py`, config schema in `src/interlace/config/config.py`) — not against existing copy on the site. Marketing and blog content has drifted from the product before.

**Design system** (`src/routes/layout.css`): Dark-first theme using CSS custom properties. Zinc base colors, violet accent (#8b5cf6). Fonts: Outfit (UI), JetBrains Mono (code). Includes syntax highlighting theme for highlight.js.

Two rules in that file are load-bearing and easy to undo by accident:

- **Fonts are self-hosted** from `static/fonts` via `@font-face` in `layout.css`, with the two latin subsets preloaded in `app.html`. Do not re-add the `fonts.googleapis.com` stylesheet — it was a render-blocking request to a third origin, and the font file could not even be discovered until it had been fetched and parsed. See `static/fonts/README.md` for how to refresh the files.
- **The dim end of the text scale is bounded by contrast, not taste.** `--text-tertiary` and `--text-quaternary` land on backgrounds as light as `--surface` (#27272a) and carry real prose, so they have to clear 4.5:1 there. Anything dimmer than roughly #909099 fails. For the same reason `--accent` (#8b5cf6) is a fill and border hue, not a text hue: use `--accent-text` for violet text on a dark surface, and `--accent-strong` where white text sits on violet.

## Code Style

- Tabs, single quotes, no trailing commas, 100 char print width
- Prettier with svelte and tailwindcss plugins
- ESLint flat config with svelte plugin

## Deployment

`deploy.yml` runs on push to `master`: `moonrepo/setup-toolchain` installs proto and the
tools pinned in `.prototools`, then `moon run site:build` builds and the result deploys to
GitHub Pages. `static/CNAME` pins the `interlace.sh` custom domain into the artifact.

`ci.yml` runs lint and type-check on pushes and pull requests, deliberately separate from
the deploy so a formatting slip surfaces without blocking a docs deploy.

### Edge configuration (not in this repo)

`interlace.sh` is served through Cloudflare in front of GitHub Pages, so a few things
Lighthouse reports cannot be fixed by a commit here:

- **Cache lifetimes.** Everything under `/_app/immutable/` is content-hashed and safe to
  cache for a year, but the edge currently serves it with a 4 hour TTL — a repeat visitor
  re-downloads ~98 KiB they already have. Fix with a Cloudflare Cache Rule matching
  `/_app/immutable/*` and `/fonts/*` that sets `Cache-Control: public, max-age=31536000, immutable`.
- **Security headers.** No CSP, HSTS, COOP or `X-Frame-Options` are set. Add them as a
  Cloudflare Transform Rule (response headers); GitHub Pages cannot set them and a
  `static/_headers` file would be ignored.
- **Third-party cookies.** The d8a analytics tag sets two cookies from `global.t.d8a.tech`.
  That is what holds the Best Practices score at 0.77, and it is a product decision rather
  than a bug — worth knowing before chasing that number.
