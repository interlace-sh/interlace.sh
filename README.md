# interlace.sh

Marketing and documentation website for [Interlace](https://github.com/interlace-sh/interlace) — a
Python/SQL-first data platform combining transformation, orchestration, and durable streaming in one
process.

Live at **[interlace.sh](https://interlace.sh)**. Statically pre-rendered and deployed to GitHub
Pages on every push to `master`.

## Quick start

The toolchain is pinned with [proto](https://moonrepo.dev/proto) and tasks run through
[moon](https://moonrepo.dev/moon):

```bash
proto install           # moon, Node and pnpm at the versions in .prototools
moon run site:dev       # dev server
```

moon installs `node_modules` on demand, so there is no separate `pnpm install` step.

## Tasks

The project is registered with moon as `site`. Pass extra args after `--`, e.g.
`moon run site:check -- --watch`.

| Task                    | Does                              |
| ----------------------- | --------------------------------- |
| `moon run site:dev`     | Start the dev server              |
| `moon run site:build`   | Build the static site to `build/` |
| `moon run site:preview` | Preview the production build      |
| `moon run site:check`   | Type-check with `svelte-check`    |
| `moon run site:lint`    | Prettier check + ESLint           |
| `moon run site:format`  | Auto-format with Prettier         |

Build, check and lint results are cached by moon and keyed on their declared inputs, so repeat runs
are near-instant when nothing has changed. The equivalent `pnpm` scripts in `package.json` are kept
in sync and bypass the cache.

## Stack

- **[SvelteKit 5](https://svelte.dev)** with `adapter-static` — fully pre-rendered, no server
- **TypeScript** (strict) and **Svelte 5** runes
- **[Tailwind CSS 4](https://tailwindcss.com)** over a CSS custom-property design system
- **[MDsveX](https://mdsvex.pngwn.io)** — Markdown with Svelte components, for docs and blog
- **pnpm**, orchestrated by moon

## Layout

```
src/
  lib/components/
    layout/     Header, Footer, Container
    marketing/  Home and features page sections
    docs/       Sidebar, table of contents, pagination
    blog/       Post cards and headers
  routes/
    +page.svelte      Home
    features/         Feature overview
    solutions/        Use cases
    blog/             Listing + one directory per post
    docs/             getting-started, core-concepts, guides, reference
    layout.css        Design system and syntax highlighting theme
static/
  screenshots/  Web UI captures used on the home page
```

Each component directory has a barrel `index.ts`. Path aliases: `$components` →
`src/lib/components`.

## Writing content

Docs and blog posts are `.md` files processed by MDsveX.

**A blog post** is `src/routes/blog/<slug>/+page.md` with frontmatter:

```markdown
---
title: Post Title
date: 2026-07-31
author: Interlace Team
excerpt: One or two sentences shown on the blog listing.
---
```

The listing at `/blog` builds itself from that frontmatter and sorts by date — there is nothing to
register by hand.

**A docs page** is `src/routes/docs/<section>/<page>/+page.md`. Docs navigation is currently
hardcoded in `DocsSidebar.svelte`, so new pages need an entry there.

Claims about Interlace behaviour should be checked against the
[interlace](https://github.com/interlace-sh/interlace) source rather than existing copy — the site
has drifted from the product before.

## Deployment

`.github/workflows/deploy.yml` runs on push to `master`: `moonrepo/setup-toolchain` installs proto
and the pinned tools, `moon run site:build` produces `build/`, and `actions/deploy-pages` publishes
it. `.github/workflows/ci.yml` runs lint and type-check separately on pushes and pull requests.
