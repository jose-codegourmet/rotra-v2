# AGENTS.md — `@rotra/player`

> Nested entry for `apps/player` (ROTRA Player Information, port 3001). Root: [`/AGENTS.md`](../../AGENTS.md) ·
> Structure: [architecture §4](../../docs/architecture.md#4-inside-an-app-nextjs-16-app-router) ·
> Pages and routes: [coding conventions §9](../../docs/coding-conventions.md#9-nextjs-16).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Player routes

Foundation's existing `/login` and protected `/me/*` paths take precedence over the proposed
`/sign-in` and `/profile/*` aliases in P01.10. Public routes: `/`, `/rank`, `/find/[rtrId]`,
`/players/[playerId]`, `/players/[playerId]/rank`, `/players/[playerId]/games`.
Auth screens use `/login`, `/forgot-password`, `/reset-password/[token]`, `/claim/[token]`.
Account screens will use `/me/edit`, `/me/player-id`, `/me/privacy-and-contact` under the existing
proxy boundary. P01 builds the ranking routes; profile and auth screens arrive in their own epics.
