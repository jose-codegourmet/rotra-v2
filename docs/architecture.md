# Architecture — ROTRA v1

**Last verified:** 2026-10-27 · **Status:** target architecture for the v1 rebuild. **Almost nothing below
is built yet.** Section 1 says exactly what exists today.

**Read this when** you add an app, package, route, provider, data hook, or dependency, or need to know
where something belongs. For *how to write* the code, read [coding-conventions.md](coding-conventions.md).

---

## 1. What exists today

| Path | State |
|---|---|
| `apps/` | `queue`, `player`, `admin`: Next.js 16 scaffolds with placeholder home pages (F01.1) |
| `packages/config` | Old v0 Tailwind 3-style token file and tsconfig. **To be replaced** by the prototype tokens (§6) |
| `packages/db` | **Empty.** The database epic comes after the mock phase (§9) |
| `openspec/` | Cleared. Not used in the v1 process |
| `docs/frames/*/*.html` | The three clickable prototypes: the design source of truth |
| `Makefile`, root `package.json` scripts | Run the three apps through Turborepo (F01.1) |
| `.husky/`, `.github/` | Missing. Git hooks and CI are set up by Foundation tickets |

Until the Foundation epic lands, the apps show placeholders only. Do not claim a screen works.

---

## 2. The shape of the system

Three Next.js 16 apps share a component library and a mock data layer. Real persistence (Supabase +
Prisma) replaces the mock fetchers later without touching screens.

```text
rotra/
├── apps/
│   ├── queue/        @rotra/queue    Club operator app (main v1 product)      :3000
│   ├── player/       @rotra/player   Player Information: profiles, leaderboard :3001
│   └── admin/        @rotra/admin    Platform owner tools                      :3002
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

### Product → app

| Product | App | Prototype (design reference) | Business rules |
|---|---|---|---|
| Queue | `apps/queue` | [rotra-queue.html](frames/queue-app/rotra-queue.html) | [Queue](business_logic/product/queue/README.md) |
| Player Information | `apps/player` | [rotra-player.html](frames/player-app/rotra-player.html) | [Player Information](business_logic/product/player-information/README.md) |
| Admin | `apps/admin` | [rotra-admin.html](frames/admin-app/rotra-admin.html) | [Admin](business_logic/product/admin/README.md) |

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

Only `fetchers.ts` changes. It calls the app's route handlers:

```text
fetchers.ts ──► app/api/<feature>/route.ts ──► @rotra/db/<feature>-service ──► Prisma ──► Supabase Postgres
```

Writes go through **route handlers**, not Server Actions: the Queue app's offline sync needs a stable
HTTP API, and one write path is easier to review. Adding a Server Action needs a decision first.

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

The old `packages/config/tailwind-config/index.ts` (Satoshi, `bg-base` names) and the old visual spec in
[branding.md](branding/branding.md) are superseded by the prototypes for every visual decision.

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
- **Open:** Prisma 7 (stable) or Prisma 8 (release candidate, a different "contract" model). Prisma 7
  is the recommendation; confirm before the database epic starts.

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
| Hosting (one Vercel project per app was the old plan) | Open |
| App ports | Settled: 3000 / 3001 / 3002 (F01.1) |
| Test runner for money and ranking math | Chosen in a Foundation ticket |
