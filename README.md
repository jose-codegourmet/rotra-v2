# ROTRA

The badminton session operating system. *Run the game.*

**Status (October 27, 2026):** v1 rebuild. The docs and the three clickable prototypes are done; the apps
are being rebuilt from scratch on mock data. The Foundation epic is scaffolding the apps and shared packages.

| Product | App | Design reference |
|---|---|---|
| Queue: clubs run sessions, courts, and the shared queue | `apps/queue` | [rotra-queue.html](docs/frames/queue-app/rotra-queue.html) |
| Player Information: profiles, shared rank, leaderboard | `apps/player` | [rotra-player.html](docs/frames/player-app/rotra-player.html) |
| Admin: clubs, licenses, players, settings | `apps/admin` | [rotra-admin.html](docs/frames/admin-app/rotra-admin.html) |

Shared packages: `@rotra/ui` (components + Storybook), `@rotra/data` (types, mocks, hooks),
`@rotra/schema` (Zod fields), `@rotra/config` (tsconfig + tokens), `@rotra/db` (Prisma, later).

## Start here

- **People:** [docs/README.md](docs/README.md)
- **AI agents:** [AGENTS.md](AGENTS.md)
- How it fits together: [docs/architecture.md](docs/architecture.md)
- How to write code: [docs/coding-conventions.md](docs/coding-conventions.md)
- How work flows (epics, tickets, PRs): [docs/ways-of-working.md](docs/ways-of-working.md)
- Vocabulary: [docs/product-terms.md](docs/product-terms.md)

## Prerequisites

- **Node.js 24** via [nvm](https://github.com/nvm-sh/nvm) (`.nvmrc` is included)
- **pnpm 11**: `corepack enable && corepack prepare pnpm@11.0.8 --activate`

## Commands

The root scripts and the `Makefile` (`make dev`, `make lint`, …) run these. Ports: queue 3000, player 3001, admin 3002.

```bash
nvm use && pnpm install
nvm use && pnpm dev                          # all apps
nvm use && pnpm --filter @rotra/queue dev    # one app
nvm use && pnpm --filter @rotra/ui storybook
nvm use && pnpm lint && pnpm type-check && pnpm build
```

## Tech stack

Next.js 16 (App Router) · React 19.2 · TypeScript 5 · Tailwind CSS 4 + shadcn/ui · TanStack Query v5 ·
TanStack Table v8 · React Hook Form + Zod · Redux Toolkit · Motion · Storybook · Turborepo + pnpm ·
Biome · Supabase + Prisma (later). Details: [architecture](docs/architecture.md),
[coding conventions §1](docs/coding-conventions.md#1-stack).
