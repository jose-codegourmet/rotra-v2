# Architecture — ROTRA v1

**Last verified:** 2026-10-28 · **Status:** target architecture for the v1 rebuild, with mock
implementations in progress. Section 1 distinguishes implemented flows from future work.

**Read this when** you add an app, package, route, provider, data hook, or dependency, or need to know
where something belongs. For *how to write* the code, read [coding-conventions.md](coding-conventions.md).

---

## 1. What exists today

| Path | State |
|---|---|
| `apps/` | Three Next.js 16 apps with mock route/container code. Queue includes preparation, console, results and public sessions; Player includes profiles, ranking/history and account flows; Admin includes sign-in and workspace navigation. File presence is not end-to-end verification |
| `packages/config` | Shared tsconfig and `theme.css`: Tailwind 4 tokens copied from the prototypes (F02.1) |
| `packages/ui` | Shared visual components and forms with stories and metadata, plus `cn`, `ComponentMeta` and the one Storybook |
| `packages/schema` | Shared Zod field families, phone/money tests, Vitest (F05.1) |
| `packages/data` | In-memory store, mock auth, club/session and Player fixtures, fetchers, query keys and hooks |
| `packages/db` | Server-only Prisma 7 package (F07.8 scaffold); schema groups and services land through [F07 #241](https://github.com/jose-codegourmet/rotra-v2/issues/241) (§10) |
| `openspec/` | Focused Player implementation records restored at the product owner’s request; see `openspec/README.md`. Product and prototype docs retain precedence |
| `app/mocksups-app/*/*.html` | The three clickable prototypes: the design source of truth |
| `Makefile`, root `package.json` scripts | Run the three apps through Turborepo (F01.1) |
| `.husky/`, `.github/` | Commitlint hook (pre-commit lint disabled) and advisory CI; see ways-of-working §5 |

All three apps mount QueryClient providers. Implemented flows use in-memory mocks; real auth,
persistence and backend integration remain future work. Player implementation and remaining account/claim
scope are recorded in `openspec/specs/player-information/spec.md`; no complete numerical ranking
engine is implemented.

---

## 2. The shape of the system

Three Next.js 16 apps share a component library and a mock data layer. Real persistence (Supabase +
Prisma) is intended to preserve the existing screen and hook contracts while replacing mock fetchers
and adding the server and offline infrastructure described in §5.

```text
rotra/
├── apps/
│   ├── queue/        @rotra/queue    Club operator app (main v1 product)      :9000
│   ├── player/       @rotra/player   Player Information: profiles, leaderboard :9001
│   └── admin/        @rotra/admin    Platform owner tools                      :9002
├── packages/
│   ├── ui/           @rotra/ui       Every visual component and form + the one Storybook
│   ├── data/         @rotra/data     Domain types, fixtures, mock store, fetchers, query keys, hooks
│   ├── schema/       @rotra/schema   Shared Zod field schemas (email, phone, date, money, …)
│   ├── config/       @rotra/config   tsconfig bases + Tailwind 4 theme tokens (CSS)
│   └── db/           @rotra/db       Prisma schema + services (database epic, later)
├── docs/                             Product, screen, database, and engineering docs
└── email-templates/                  Supabase auth email HTML (copy-paste artifacts)
```

Ports are set in each app's `dev` and `start` scripts.

The separate prototype workspace `app/mocksups-app` runs on port 9003 (`pnpm mockups`). Its
Node HTTP server and browser History API expose `/player`, `/queue`, and `/admin`, with the
actual app paths beneath those prefixes. It serves the canonical HTML designs with optional
routing adapters and keeps their fictional browser-local stores. It does not import the real
apps or provide operational persistence/auth. See its [route map](../app/mocksups-app/README.md).


### Product → app

| Product | App | Prototype (design reference) | Business rules |
|---|---|---|---|
| Queue | `apps/queue` | [rotra-queue.html](../app/mocksups-app/queue-app/rotra-queue.html) | [Queue](business_logic/product/queue/README.md) |
| Player Information | `apps/player` | [rotra-player.html](../app/mocksups-app/player-app/rotra-player.html) | [Player Information](business_logic/product/player-information/README.md) |
| Admin | `apps/admin` | [rotra-admin.html](../app/mocksups-app/admin-app/rotra-admin.html) | [Admin](business_logic/product/admin/README.md) |

The Queue app also serves the **public session page** (session link): no sign-in, separate audience,
its own route group. World is v2: no app, no routes.

---

## 3. Dependency rules

```text
apps/*  ──►  @rotra/ui  ──►  @rotra/schema
   │             │  (import type only)
   │             └──────────►  @rotra/data (types)
   ├──────►  @rotra/data  ──►  @rotra/schema
   ├──────►  @rotra/schema
   └──────►  @rotra/config        (everything may use config)
```

| Rule | Why |
|---|---|
| `@rotra/ui` never imports hooks, fetchers, or the mock store, only `import type` from `@rotra/data` | Components stay pure and Storybook-able; data wiring lives in apps |
| `@rotra/data` never imports `@rotra/ui` or an app | Swapping mocks for real fetchers touches one package |
| Apps never import each other | Each app deploys alone |
| A package never imports from an app | No cycles |
| `@rotra/db` is imported only by server code (route handlers) | Prisma never reaches a client bundle |

**Imports go through `package.json` `exports` subpaths**, one per component or module, e.g.
`@rotra/ui/match-card`, `@rotra/data/queue-session`, `@rotra/schema/phone`. There are no `index.ts`
barrels anywhere.

---

## 4. Inside an app (Next.js 16 App Router)

```text
apps/queue/src/
├── app/
│   ├── layout.tsx                       Root layout: fonts, <html data-theme>, providers
│   ├── (auth)/login/page.tsx            Club sign-in
│   ├── (operator)/                      Signed-in club screens; shared shell layout
│   │   ├── layout.tsx                   Top bar (sync status, theme switch), left nav, bottom dock
│   │   ├── page.tsx                     Home dashboard
│   │   └── sessions/[sessionId]/
│   │       ├── page.tsx                 Thin server component: awaits params, renders the container
│   │       ├── loading.tsx · error.tsx
│   │       └── _components/
│   │           └── session-console/
│   │               ├── SessionConsole.tsx       'use client' container: hooks + @rotra/ui pieces
│   │               └── SessionConsole.meta.ts
│   └── (public)/s/[slug]/page.tsx       Public session page (no sign-in)
├── providers/                           QueryClientProvider, Redux Provider, ThemeProvider, Toaster
├── store/                               Redux Toolkit: auth + UI chrome only
│   └── slices/<name>Slice.ts
└── proxy.ts                             Route guard (Next 16 replaces middleware.ts)
```

Route paths above illustrate the pattern; the real route list comes from the screen docs' navigation
([navigation.md](screens/product/navigation.md)) and is fixed in each app's scaffold ticket. Screen IDs
(`Q-CONSOLE`, …) are documentation names, not URLs.

| Layer | Owns | Never |
|---|---|---|
| `page.tsx` / `layout.tsx` | Route params, metadata, choosing the container | Data fetching through hooks, visual markup beyond layout |
| `_components/<name>/` | Calling `@rotra/data` hooks, mutations, toasts, arranging `@rotra/ui` pieces | Its own visual design: anything with its own look goes in `@rotra/ui` |
| `@rotra/ui` component | Markup, styles, animation, accessibility, local UI state | Fetching, routing, global state |

---

## 5. Data flow

### Mock phase (now)

```text
@rotra/ui component (props)
  ◄── _components container ('use client')
        └─ useQueueSession(id) / useStartMatch()        @rotra/data/<domain>/hooks
             └─ TanStack Query (queryKeys.ts)
                  └─ fetchers.ts  ──►  mock store (in memory, seeded from fixtures, fake latency)
```

- **Fixtures** in `@rotra/data/fixtures/` copy the prototypes' sample clubs, players, sessions, and
  results. Storybook and the mock store use the same fixtures.
- **The mock store** keeps state in memory for the page visit and resets on reload. Mutations change
  it and invalidate the right query keys, so screens behave like the prototype.
- **Dev toggles** (offline, license expired, next save fails, conflict) mirror each prototype's
  "Prototype" menu. They are developer tools, never product features, and are excluded from production builds.

### Real phase (later)

The frontend compatibility goal is to keep visual components and hook contracts stable as
`fetchers.ts` calls the app's Route Handlers:

```text
fetchers.ts ──► app/api/<feature>/route.ts ──► @rotra/db/<feature>-service ──► Prisma ──► Supabase Postgres
```

Writes go through **route handlers**, not Server Actions: the Queue app's offline sync needs a stable
HTTP API, and one write path is easier to review. Adding a Server Action needs a decision first.

This also requires real session verification, authorized domain services, reviewed Prisma schemas,
serialization/error contracts, account-scoped caches, and the Queue working copy/outbox/replay
engine. Mocks are not a fallback after a real write fails. The [command inventory](database_design/product/command-contracts.md)
records the existing code surface and unresolved transport decisions; it does not approve API URLs.

**No Supabase Realtime.** Screens refetch with TanStack Query. A live channel needs a decision first.

---

## 6. Styling, theming, and motion

| Concern | Decision |
|---|---|
| CSS | Tailwind CSS 4, configured in CSS (`@theme`), not a JS config |
| Tokens | Copied from the prototypes' CSS variables (`--bg`, `--surface`, `--elev`, `--fg`, `--fg2`, `--fg3`, `--accent`, `--border`, `--warn`, `--error`, `--court*`, `--r`, …) into `@rotra/config`, mapped to Tailwind utilities |
| Themes | Both ship. **Dark by default**; light via `<html data-theme="light">`; choice remembered per device. The prototypes' theme rules are the reference |
| Fonts | Manrope (UI) and JetBrains Mono (IDs, numbers), plus Silkscreen for the Player leaderboard podium, loaded with `next/font` |
| Base components | shadcn/ui (Radix) **for behaviour and accessibility only**; restyled to match the prototypes exactly |
| Motion | `motion` (`motion/react`) for component animation; all motion respects reduced-motion |
| Tables | TanStack Table v8 behind a `@rotra/ui` data-table component |

The tokens live in `packages/config/theme.css` ([its AGENTS.md](../packages/config/AGENTS.md) lists the
utilities). The old visual spec in [branding.md](branding/branding.md) is superseded by the prototypes
for every visual decision.

---

## 7. State

| Kind | Tool | Examples |
|---|---|---|
| Server / mock data | TanStack Query v5 | Sessions, roster, queue, matches, profiles, leaderboard, clubs, licenses |
| Global client state | Redux Toolkit | Signed-in account, nav collapsed, dev toggles |
| Component state | `useState` / `useReducer` | Sheet open, selected tab, draft lineup before confirm |
| Form state | React Hook Form + Zod | Every form |
| Theme | Small provider in `@rotra/ui` | `data-theme` + per-device storage |

Redux never holds server data and has no async thunks.

---

## 8. Auth (target, not built)

| App | Who signs in | How |
|---|---|---|
| Queue | Club account | Username + password. Forgotten password is reset by the platform owner |
| Player Information | Registered player | Phone or email + password; recovery by email |
| Admin | Platform owner | Admin sign-in |
| Public pages | Nobody | No auth |

In the mock phase, sign-in is mocked like the prototypes (anything signs in) and `proxy.ts` only checks a
mock session. Real auth (Supabase Auth) is its own epic. **No Facebook or any social login.**

**Server boundary (F07.20).** `ROTRA_DATA_MODE` (server-only, default `mock`) picks the path; there is
no fallback from real to mock.

| Layer | Real mode |
|---|---|
| `proxy.ts` | `@rotra/db/auth/proxy-session` verifies the Supabase JWT (`getClaims`), refreshes session cookies, deletes `rotra-mock-*` cookies, and redirects. Navigation only; it never loads Prisma |
| Route Handler | `handleAccountRequest(audience, routeCookieAdapter(await cookies()), run)` from `@rotra/db/service/handler`: verifies the session again, maps the subject to the app's account type from current server state (provisioned/not disabled club account, not disabled player account, active admin), then `run` checks scope with `@rotra/db/service/authorize` (`requireOwnClub`, `requireOwnPlayer`, `requireAdmin`, `requireClubEntitlement`, `requireRevision`) |
| Public reads | `handlePublicRead(id, run)`; only IDs in `PUBLIC_READS` are anonymous, each with an allowlisted projection |
| Responses | Private: `Cache-Control: private, no-store`, `Vary: Cookie`. Bodies pass `toJson` (`@rotra/db/service/serialize`): UUIDs as strings, instants as ISO strings, bigint revisions as decimal strings, money as `{ amountMinor, currency }`, null kept; class instances such as Prisma models are refused. Errors are `{ error: { code, message, fields? } }` (`@rotra/db/service/errors`); another club's or player's ID answers `not_found` |
| Client | `useAccountScope(accountId)` / `clearAccountQueries` (`@rotra/data/auth/account-scope`) drop the previous account's queries on account change or sign-out, keeping `auth`/`sync` queries and every mutation, so unsynced evidence survives |

Wrong account types, forged mock cookies, and cross-club/player IDs are denied at the handler, not only
in the proxy. Database credentials and Supabase keys are read only from server env. Application tables
have no `anon`/`authenticated` grants, so the Data API exposes none of them.

---

## 9. Offline (Queue only)

The Queue app must keep running a downloaded session without internet. Rules:
[Offline](business_logic/product/queue/modules/offline/README.md) · data model:
[offline-sync](database_design/product/queue/modules/offline-sync.md).

- **Mock phase:** UI states only (offline banner, pending-sync counts, recovery and reconciliation
  screens), driven by a dev toggle in the mock store.
- **Later epic:** IndexedDB persistence, a durable operation queue, sync and conflict handling. Built
  after the database exists.

---

## 10. Database (later epic)

- Supabase Postgres; Prisma in `@rotra/db`.
- The **Prisma schema is split into files** by product and entity group. Never one `schema.prisma`:

```text
packages/db/
├── prisma.config.ts                 schema: "prisma/schema", migrations: "prisma/migrations"
└── prisma/
    ├── schema/
    │   ├── base.prisma              generator + datasource only
    │   ├── admin/                   club, admin-account, license, configuration, contact-request
    │   ├── queue/                   club-player, session, match, sync, results, financials
    │   └── player/                  player, ranking
    └── migrations/
```

- Tables and fields follow the [database design](database_design/product/README.md) and its
  [conventions](database_design/product/conventions.md). Entity names match [product terms §12](product-terms.md#12-term--code-identifier).
- **Scaffolded (F07.8):** `packages/db` pins Prisma **7.10.1** (latest stable 7.x; 8 is still a release
  candidate) with the `prisma-client` generator, `@prisma/adapter-pg` and `pg`. The generated client
  goes to `src/generated/prisma` (gitignored) and is exposed only through the server-only
  `@rotra/db/client` subpath. Final approval of the version and migration ownership is still tracked in
  [#243](https://github.com/jose-codegourmet/rotra-v2/issues/243).
- **Connections:** `DATABASE_URL` (pooled, runtime role) for the apps; `DIRECT_URL` (migration role)
  for the CLI through `prisma.config.ts`. Both are server-only; see `packages/db/.env.example`.
- **No silent DDL:** `db:migrate:draft` writes SQL with `--create-only`; applying a migration needs the
  §13 sign-off. Package commands are listed in `packages/db/AGENTS.md`.

---

## 11. Email templates

Supabase sends auth emails (password reset, verification) through custom SMTP. Templates are standalone
HTML in `email-templates/` that a person pastes into the Supabase dashboard. No app imports them, and
editing one changes nothing until it is pasted. See [email-templates.md](email-templates.md).

---

## 12. Open architecture decisions

| Decision | Status |
|---|---|
| Prisma 7 vs 8 | Open; recommend 7 |
| Real auth details (Supabase Auth setup for club usernames) | Open; auth epic |
| Mock store persistence across reloads | In-memory for now |
| Hosting | Settled: one Vercel project with [services](https://vercel.com/docs/services) (`vercel.json`), routed by host: `queue.rotra.club`, `player.rotra.club`, `admin.rotra.club`. Automatic Git deployments are disabled with `git.deploymentEnabled: false`. Deploy manually from `main` through `.github/workflows/deploy.yml`; the GitHub `production` environment restricts deployments to `main` and holds the deployment credentials. See [deployment setup](../README.md#production-deployments). Storybook is not deployed. What the bare domain shows is open |
| App ports | Settled: 9000 / 9001 / 9002 (F01.1) |
| Test runner for money and ranking math | Vitest (F05.1); also allowed for phone parsing and queue rules |
