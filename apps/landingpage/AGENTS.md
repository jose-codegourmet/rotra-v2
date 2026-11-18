# AGENTS.md — `@rotra/landingpage`

> Nested entry for `apps/landingpage` (rotra.club marketing site, port 9004). Root: [`/AGENTS.md`](../../AGENTS.md) ·
> How it is built and where the art lives: [README](README.md).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## The site

A static export (`output: 'export'`, `next build` writes `out/`): one page, `/`, whose hash routes (`#home`,
`#clubs`, `#ranking`, `#request`, `#find`, `#privacy`, `#terms`; `#pricing` redirects to `#request`) show one `<main class="view">` at
a time. The markup is server components in `src/app/_components/`; the plain scripts in `src/scripts/` run once
after hydration (`SiteScripts`) and change that DOM directly, so the markup components must never re-render or
hold state. Its own stylesheet (`src/app/globals.css`), no Tailwind, no `@rotra/ui`. Art and the Rive pipeline:
see the README.
