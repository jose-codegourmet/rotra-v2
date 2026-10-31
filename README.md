# ROTRA

The badminton session operating system. *Run the game.*

**Status (October 27, 2026):** v1 rebuild. The docs and the three clickable prototypes are done; the apps
are being rebuilt from scratch on mock data. The Foundation epic is scaffolding the apps and shared packages.

| Product | App | Design reference |
|---|---|---|
| Queue: clubs run sessions, courts, and the shared queue | `apps/queue` | [rotra-queue.html](app/mocksups-app/queue-app/rotra-queue.html) |
| Player Information: profiles, shared rank, leaderboard | `apps/player` | [rotra-player.html](app/mocksups-app/player-app/rotra-player.html) |
| Admin: clubs, licenses, players, settings | `apps/admin` | [rotra-admin.html](app/mocksups-app/admin-app/rotra-admin.html) |

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

## Production deployments

Deployments run through the **Deploy production** GitHub Action
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). Open **Actions → Deploy production →
Run workflow**, select **main**, and run it. There are no deployment triggers for pushes or pull requests;
the job also refuses to deploy any branch other than `main`.

The GitHub **production** environment allows only the `main` branch. It needs:

- Environment variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, targeting the existing `rotra-v2`
  Vercel project. These are configured in GitHub, not committed credentials.
- Environment secret `VERCEL_TOKEN`, created in Vercel with access to that project and added directly
  in GitHub under **Settings → Environments → production → Environment secrets**.

The workflow installs the locked dependencies, runs lint and type-check, pulls the production Vercel
configuration, builds the three services, and deploys the build output together. The deployment URL
appears in the run summary. Vercel's Git connection stays disconnected and `git.deploymentEnabled`
stays `false`, so the GitHub Action is the deployment entry point. Local `.vercel` configuration and
build output are ignored by Git.

## Tech stack

Next.js 16 (App Router) · React 19.2 · TypeScript 5 · Tailwind CSS 4 + shadcn/ui · TanStack Query v5 ·
TanStack Table v8 · React Hook Form + Zod · Redux Toolkit · Motion · Storybook · Turborepo + pnpm ·
Biome · Supabase + Prisma (later). Details: [architecture](docs/architecture.md),
[coding conventions §1](docs/coding-conventions.md#1-stack).

The canonical editable prototypes live in [app/mocksups-app](app/mocksups-app/README.md). Run `nvm use && pnpm mockups` to serve them independently on port 3003.
