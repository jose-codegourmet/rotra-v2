# Architecture — ROTRA v1

**Last verified:** 2026-11-07 · **Status:** target architecture for the v1 rebuild. Mock mode is the
default; an opt-in real mode is partly connected (§5, §8, §10). Current status: [MVP hub](mvp/README.md).

**Read this when** you add an app, package, route, provider, data hook, or dependency, or need to know
where something belongs. For *how to write* the code, read [coding-conventions.md](coding-conventions.md).

---

## 1. What exists today

| Path | State |
|---|---|
| `apps/` | Three Next.js 16 apps with mock route/container code, plus the separate static prototype app in `apps/mockup`. Queue includes preparation, console, results and public sessions; Player includes profiles, ranking/history and account flows; Admin includes sign-in and workspace navigation. File presence is not end-to-end verification |
| `packages/config` | Shared tsconfig and `theme.css`: Tailwind 4 tokens copied from the prototypes (F02.1) |
| `packages/ui` | Shared visual components and forms with stories and metadata, plus `cn`, `ComponentMeta` and the one Storybook |
| `packages/schema` | Shared Zod field families, phone/money tests, Vitest (F05.1) |
| `packages/data` | In-memory store, mock auth, club/session and Player fixtures, fetchers, query keys and hooks |
| `packages/db` | Server-only Prisma 7 package (F07.8 scaffold); schema groups and services land through [F07 #241](https://github.com/jose-codegourmet/rotra-v2/issues/241) (§10) |
| `openspec/` | Focused Player implementation records restored at the product owner’s request; see `openspec/README.md`. Product and prototype docs retain precedence |
| `apps/mockup/*/*.html` | The three clickable prototypes: the design source of truth |
| `Makefile`, root `package.json` scripts | Run the three apps through Turborepo (F01.1) |
| `.husky/`, `.github/` | Commitlint hook (pre-commit lint disabled) and advisory CI; see ways-of-working §5 |

All three apps mount QueryClient providers. Flows use in-memory mocks by default; real mode connects
Route Handlers and `packages/db` services for parts of each app (see the [MVP hub](mvp/README.md)). Player implementation and remaining account/claim
scope are recorded in `openspec/specs/player-information/spec.md`; no complete numerical ranking
engine is implemented.

---

## 2. The shape of the system

Three Next.js 16 apps share a component library and a data layer that runs on mocks by default.
Opt-in real mode (Supabase + Prisma) keeps the screen and hook contracts and swaps mock fetchers for
Route Handlers; the offline infrastructure in §5 and §9 is not built yet.

```text
rotra/
├── apps/
│   ├── queue/        @rotra/queue    Club operator app (main v1 product)      :9000
│   ├── player/       @rotra/player   Player Information: profiles, leaderboard :9001
│   ├── admin/        @rotra/admin    Platform owner tools                      :9002
│   └── mockup/       @rotra/mockups  Canonical routed HTML prototypes          :9003
├── packages/
│   ├── ui/           @rotra/ui       Every visual component and form + the one Storybook
│   ├── data/         @rotra/data     Domain types, fixtures, mock store, fetchers, query keys, hooks
│   ├── schema/       @rotra/schema   Shared Zod field schemas (email, phone, date, money, …)
│   ├── config/       @rotra/config   tsconfig bases + Tailwind 4 theme tokens (CSS)
│   └── db/           @rotra/db       Prisma schema + server services (real mode)
├── docs/                             Product, screen, database, and engineering docs
└── email-templates/                  Supabase auth email HTML (copy-paste artifacts)
```

Ports are set in each app's `dev` and `start` scripts.

The separate prototype workspace `apps/mockup` runs on port 9003 (`pnpm mockups`). Its
Node HTTP server and browser History API expose `/player`, `/queue`, and `/admin`, with the
actual app paths beneath those prefixes. It serves the canonical HTML designs with optional
routing adapters and keeps their fictional browser-local stores. It does not import the real
apps or provide operational persistence/auth. See its [route map](../apps/mockup/README.md).

Production uses one Vercel Services project rooted at `./`. Host rewrites map `mockup.rotra.club`,
`queue.rotra.club`, `player.rotra.club` and `admin.rotra.club` to their matching `apps/` directories.
The mockup service publishes `dist/public` as static files; the other services use Next.js. The manual
Deploy production workflow builds and publishes all four services together. Domain attachment/DNS
is configured outside the repository; see the [deployment setup](../README.md#production-deployments).


### Product → app

| Product | App | Prototype (design reference) | Business rules |
|---|---|---|---|
| Queue | `apps/queue` | [rotra-queue.html](../apps/mockup/queue-app/rotra-queue.html) | [Queue](business_logic/product/queue/README.md) |
| Player Information | `apps/player` | [rotra-player.html](../apps/mockup/player-app/rotra-player.html) | [Player Information](business_logic/product/player-information/README.md) |
| Admin | `apps/admin` | [rotra-admin.html](../apps/mockup/admin-app/rotra-admin.html) | [Admin](business_logic/product/admin/README.md) |

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
| Apps never import each other | Each app builds independently; the Services deployment releases them together |
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

Individual presence uses a transient QueryClient/session-scoped DebouncedBatch overlay, observed by useSessionRoster. Accepted query data remains separate so background refetches cannot overwrite newer intent. useDebouncedBatch handles lifecycle flushes; setPresenceMany makes one guarded atomic mock write. Other roster mutations await pending presence first. Payments use the same helper: useSetPaymentMarks batches desired paid states, and useSessionPayments overlays intent onto accepted marks for every reader and derives totals with the existing paymentTotals rule. Both use 800 ms and flush on panel exit; this is not durable offline storage.

```text
@rotra/ui component (props)
  ◄── _components container ('use client')
        └─ useQueueSession(id) / useStartMatch()        @rotra/data/<domain>/hooks
             └─ TanStack Query (queryKeys.ts)
                  └─ fetchers.ts  ──►  mock store (in memory, seeded from fixtures, fake latency)
```

- **Generate matches drafts** (formerly called Auto Queue; renamed 2026-11-06; code names unchanged) are per-session in-memory batches outside accepted matches. Selection and clearing write no sync log; only explicit atomic transfer allocates match numbers. Drafts and confirmations reset with the mock store (in real mode they live in `real/autoQueue.ts` and reset on reload).
- **Fixtures** in `@rotra/data/fixtures/` copy the prototypes' sample clubs, players, sessions, and
  results. Storybook and the mock store use the same fixtures.
- **The mock store** keeps state in memory for the page visit and resets on reload. Mutations change
  it and invalidate the right query keys, so screens behave like the prototype.
- **Dev toggles** (offline, license expired, next save fails, conflict) mirror each prototype's
  "Prototype" menu. They are developer tools, never product features, and are excluded from production builds.

### Real mode (opt-in, partial)

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

## 8. Auth (real for Queue and Admin)

| App | Who signs in | How |
|---|---|---|
| Queue | Club account | Username + password. Forgotten password is reset by the platform owner |
| Player Information | Registered player | Phone or email + password; MVP recovery is manual ([D-2026-11-07-01](mvp/decisions.md#d-2026-11-07-01)) |
| Admin | Platform owner | Admin sign-in |
| Public pages | Nobody | No auth |

In mock mode, sign-in is mocked like the prototypes (anything signs in) and `proxy.ts` only checks a
mock session. In real mode, Queue (club) and Admin sign-in use Supabase Auth (below); player sign-in,
claim and recovery are not real yet. **No Facebook or any social login.**

**Server boundary (F07.20).** `ROTRA_DATA_MODE` (server-only, default `mock`) picks the path; there is
no fallback from real to mock. `NEXT_PUBLIC_ROTRA_DATA_MODE` (F07.34) is its client mirror: set both
to `real` in each app's own `.env.local` (Next reads env files from the app folder, not the repo root).

| Layer | Real mode |
|---|---|
| `proxy.ts` | `@rotra/db/auth/proxy-session` verifies the Supabase JWT (`getClaims`), refreshes session cookies, deletes `rotra-mock-*` cookies, and redirects. Navigation only; it never loads Prisma |
| Route Handler | `handleAccountRequest(audience, routeCookieAdapter(await cookies()), run)` from `@rotra/db/service/handler`: verifies the session again, maps the subject to the app's account type from current server state (provisioned/not disabled club account, not disabled player account, active admin), then `run` checks scope with `@rotra/db/service/authorize` (`requireOwnClub`, `requireOwnPlayer`, `requireAdmin`, `requireClubEntitlement`, `requireRevision`) |
| Sign-in | `@rotra/db/auth/sign-in` (`handleSignIn`, `handleSessionRead`, `handleSignOut`) behind `/api/auth/{sign-in,session,sign-out}` in Queue and Admin. Bodies are the shapes the existing hooks read (`MockSession`, `AdminSession`) |
| Session cookie | One per app: `sb-rotra-{club,player,admin}-auth` (`authCookieName(audience)` in `@rotra/db/auth/supabase`), never Supabase's default shared name. Cookies ignore the port and are shared across a parent domain, so a shared name would make the apps one session: a club sign-in on `localhost:9000` would replace the Admin sign-in on `localhost:9002`. Every Supabase client, the proxy included, passes the app's audience |
| `@rotra/data` fetchers | Journey fetchers branch on `isRealDataMode()` (`@rotra/data/real/mode`) to `real/*` clients that call the app's own `/api/*` and map DTOs back to the hook types; errors become the same `MockError` kinds. Every other fetcher, and any mock store read or write, fails with "This part of ROTRA isn't connected to saved data yet." in real mode |
| Public reads | `handlePublicRead(id, run)`; only IDs in `PUBLIC_READS` are anonymous, each with an allowlisted projection |
| Responses | Private: `Cache-Control: private, no-store`, `Vary: Cookie`. Bodies pass `toJson` (`@rotra/db/service/serialize`): UUIDs as strings, instants as ISO strings, bigint revisions as decimal strings, money as `{ amountMinor, currency }`, null kept; class instances such as Prisma models are refused. Errors are `{ error: { code, message, fields? } }` (`@rotra/db/service/errors`); another club's or player's ID answers `not_found` |
| Client | `useAccountScope(accountId)` / `clearAccountQueries` (`@rotra/data/auth/account-scope`) drop the previous account's queries on account change or sign-out, keeping `auth`/`sync` queries and every mutation, so unsynced evidence survives |

**Club logos (#374).** In real mode, the existing logo picker writes through `PATCH /api/club`.
The authorized service uploads a normalized PNG to the public `club-logos` Supabase Storage bucket
and persists its immutable URL in `clubs.logo_ref` under the displayed settings revision. Removing
it saves null. Queue and Admin readers expose the saved reference instead of returning no logo.
Bucket setup and snapshot retention are documented in [clubs/licenses](database_design/product/admin/modules/clubs-licenses.md#club-logo-persistence-374).

**Inventory (#375).** In real mode the `@rotra/data/inventory` fetchers call Queue's
`GET`/`POST /api/inventory`, `POST /api/inventory/[itemId]/stock` and `DELETE /api/inventory/[itemId]`,
backed by `@rotra/db/queue/financials`. The hooks, `inventoryKeys.list` and the DTO (`items[].runningLow`,
`stockValue` in centavos) are unchanged, so Q-INVENTORY, the session-setup cost estimate and the
operator shell read saved items. An add uses an ID generated once per open sheet (a retry saves one
item); an edit sends the displayed `revision` and a stale one is a conflict; − / + are atomic ±1 with
no revision check, so quick taps never conflict. Inventory is online only in real mode (#245): offline,
nothing is sent and the screen says so.

**Leaderboard (#403).** In real mode the `@rotra/data/leaderboard` fetchers call the Player app's
public `GET /api/leaderboard?offset=&limit=` and `GET /api/leaderboard/search?q=` (both
`handlePublicRead('leaderboard.list')`) and the signed-in `GET /api/leaderboard/me`, backed by
`@rotra/db/player/leaderboard`. Hooks, `leaderboardKeys` and the entry DTO are unchanged, and there is no
mock fallback. The reads list only stored `player_rank_current` rows that are leaderboard-eligible and
produced by an algorithm in `APPROVED_RANK_ALGORITHMS`. No rank formula is approved (#247), so the set
is empty and every read is the empty state ("No players qualify for the leaderboard yet"; my position
`null`); no fixture or computed position is ever shown. Tie precedence is also still #247.

**Public session (#398).** In real mode the `@rotra/data/public-session` fetchers call Queue's
`GET /api/public-sessions/[slug]` (`handlePublicRead('public-session.page')`), `POST …/join-request`
and `GET …/my-request` (`handleVisitorRequest`), backed by `@rotra/db/queue/public-session`. Hooks,
`publicSessionKeys` and the `PublicSessionPage` / `MyJoinRequest` DTOs are unchanged, so Q-PUBLIC-*,
the operator's public-page preview and the Record › Public tab read the allowlisted page. A 404 stays
`PublicSessionNotFoundError`. Request to join sends a `requestId` generated once per open sheet (a
retry with the same fields saves one request); the receipt (proposal pending #248) is set only as an
httpOnly, same-site browser-session cookie scoped to `/api/public-sessions/[slug]`, so a reload keeps
the visitor's status and a missing or non-matching receipt reads as null. Receipt expiry and
lost-receipt recovery stay open in #248. Sending needs internet; offline nothing is sent.

**Device, sync and batch (#399).** Real mode has no browser outbox or device copy (Q11), so every real
write is online and saved only when its Route Handler accepted it; nothing ever waits on the device.
`@rotra/data/sync` reports exactly that: `getSyncStatus`/`getSyncState` call Queue's `GET /api/sync`
(`readClubSyncSummary`: prepared/active sessions whose F07.28 completeness is unproven, plus the
server's `checkedAt`, shown as "Synced HH:MM"), with zero pending changes and connectivity from the
browser; offline they skip the server and keep the last checked time, and `connectRealSync` marks the
cached status offline on the browser's `offline` event. `getSessionIntegrity` reads
`GET /api/sessions/[sessionId]/sync` (`readSyncStatus`); unproven completeness shows as missing
records with the server's counts, never invented conflict evidence. `getSyncLog` is empty (no device
change log yet) and `retrySync` re-reads the status. **Not connected** (`NotConnectedError`):
`getDeviceDownloads` and `answerInterruption`, because enrollment, numbering, seals, conflict
authority and the interruption recovery path wait on
[#246](https://github.com/jose-codegourmet/rotra-v2/issues/246) and durable storage on Q11; no route
calls `registerDevice`, `enrollStream`, `uploadOperations`, `sealStream` or `resolveConflict` yet.
`@rotra/data/batch` is a client-side debounce over each domain's own fetcher (presence, payment
marks), so it needs no adapter. Known gap: the console's offline notice still says changes save on
this device, which is untrue in real mode until Q11.

**Session cost and payments (#397).** In real mode `getSessionCostEstimate` calls Queue's
`GET /api/sessions/[sessionId]/cost`, and the `@rotra/data/session-payment` fetchers call
`GET`/`POST /api/sessions/[sessionId]/payments` and `POST …/payments/mark-all`, backed by
`@rotra/db/queue/financials` (adapters in `packages/data/src/real/financials.ts`). Hooks, query keys
and DTOs are unchanged, so the preparation overview, the session record's Financials tab, the setup
estimate and the Payments checklist read saved data. The 800 ms switch batch (#300) is one
transaction keyed by club player; a refused mark rolls the whole batch back. Not connected: a new
paid tick with no fee set is refused (what it means is open in #245), payments are online only until
sync is wired (#399), and editing a saved estimate waits on the session edit command.

**Feature flags and ranking settings (#402).** In real mode the `@rotra/data/feature-flag` fetchers call
Admin's `GET`/`POST /api/feature-flags` and `PATCH /api/feature-flags/[key]`, and the
`@rotra/data/ranking-settings` fetchers call `GET`/`POST /api/ranking-settings`, backed by
`@rotra/db/admin/configuration`. Hooks, query keys and the DTOs are unchanged. A switch sends the
displayed `revision` and a settings save sends the `baseVersion`; a stale one comes back as a
`ConflictError` carrying the flag or the version in effect (re-read), never last-write-wins. Each add
and save carries a command ID. Saving appends a version with the algorithm reference carried forward
(`unapproved` until #247); it records configuration only and no rank is recalculated. Admin accounts
store a display name, not an email, so the `…ByEmail` fields show that name (empty for the seeded
version 1). Not connected: Player Information's ranking-settings reads (only Admin serves the route;
a public read is the leaderboard/player adapters' concern), the Player dev settings control and the
Admin "Show a placeholder flag" dev toggle, which is client-only mock UI state and never adds a row
over saved flags.

**Player Information player and account (#400).** In real mode the `@rotra/data/player` public reads
call Player Information's `GET /api/players/[playerId]`, `…/rank`, `…/games` and `GET /api/rtr-ids/[rtrId]`
(`handlePublicRead`, `player.public-profile` / `player.match-history`), backed by `@rotra/db/player/profile`
and `player/projections`. Rank is the stored projection only: with no approved formula (#247) the level
is null and the screens show their truthful no-rank state. The own-account reads and saves
(`getMyAccount`, `updateMyProfile`, `setPhonePrivacy`) call `GET /api/me/account`, `PATCH /api/me/profile`
and `POST /api/me/phone-privacy` behind `handleAccountRequest('player', …)`; saves send the player
revision of the last account read, and a stale one is a conflict. Hooks, query keys and DTOs are
unchanged. Player sign-in, password reset and registration (claim) links stay not connected: the login mapping
and claim-link rules were decided in #244 (November 7, 2026) but the routes and claim provisioning are
not built, so without a player session the own-account routes are not reachable from the screens yet.

**Admin audit and contact changes (#401).** In real mode `@rotra/data/admin-audit` reads Admin's
`GET /api/audit-events`, and `@rotra/data/contact-change-request` reads Admin's
`GET /api/contact-change-requests[/[requestId]]`, declines through `POST …/[requestId]/decline`, and
reads and submits the player's own request through Player's `GET`/`POST /api/account/contact-change`.
Hooks, query keys and DTOs are unchanged; list filters and counts reuse the mock rules over the loaded
rows. Approve, Retry application and Check status stay not connected: they change the provider login,
which waits on #196/#244. See [services.md](database_design/product/services.md#admin-audit-and-contact-change-reads-401).

**Session lifecycle (2026-11-02).** In real mode the rest of a Queue Session's life also reads and
writes saved data through `packages/data/src/real/session-live.ts`: Start session
(`POST /api/sessions/[sessionId]/start`, sending the session revision it just read; a retry returns the
active session), Edit preparation (`PATCH /api/sessions/[sessionId]` with `commandId`, `expectedRevision`
and the input, then the cost estimate), the join-requests switch (`PATCH` with `acceptJoinRequests`),
Add/Remove court (`POST …/courts`, `DELETE …/courts/[courtId]`), Extend (`POST …/extend`), presence
(`POST …/presence`, `{ all }` or `{ changes }`), Remove from roster (`DELETE …/roster/[rosterId]`), the
waitlist (`POST …/waitlist/[waitlistId]/slot`, `POST …/waitlist/fill`, `DELETE …/waitlist/[waitlistId]`)
and join requests (`POST /api/join-requests/[requestId]/confirm` and `…/decline`). The session Record
and its history are built from the saved session, roster and matches. Still not connected: editing a
court's label or start, opening courts early (no service yet), deleting a session, and the device
download.

**Matches and results (#396).** In real mode the `@rotra/data/match` queue and control commands,
`getSessionMatches`, `getLiveStandings`, the `@rotra/data/session-result` fetchers and
`invalidateSession` call Queue's `/api/sessions/[sessionId]/matches…`, `…/results…` and `…/invalid`
Route Handlers (list in [services](database_design/product/services.md)), backed by
`@rotra/db/queue/match-queue`, `match-control`, `results` and `finalization`. Hooks and query keys are
unchanged. `real/match.ts` keeps the last read of each session's queue: reorder, lineup edits,
switch sides, remove, Generate matches, Regenerate and an accepted suggestion send its queue revision (a
suggestion also its session revision), so a change made elsewhere is a conflict; match control
sends the screen's `operationId`, other commands a fresh one. Live standings use the shared
counting rule over the saved roster and matches. Everything is online only: the outbox and offline
match numbering wait on #246. **Generate matches drafts** (formerly called Auto Queue) stay a working set on the device
(`real/autoQueue.ts`, one per session, lost on reload): built from the saved session, roster and
matches and generated with the shared `autoQueue.rules` (the prototype's draft weights, pending
#247), never the mock store. Add to Main Queue rechecks each draft against a fresh read, then sends
the reviewed lineups as `POST …/matches` `source: 'auto'` (`addAutoQueueDrafts`) with that read's
queue and session revisions and each draft's ID as its operation ID: a stale revision or a draft
that needs attention is a conflict, and a retry returns the matches already saved.

**Session done (#396, owner request).** In real mode `getSessionDoneReview`, `finalizeSession` and
`getFinalizationStatus` call `…/done-review` and `…/finalization` (`real/finalization.ts`), backed by
`@rotra/db/queue/finalization` as proposed: the barriers (no active match, completeness proven, an
effective ranking policy) are the **proposed #246 barriers, pending that decision**. The server's
blocker codes become the sheet's `SessionDoneError` blockers. No projection worker is hosted yet
(#243), so the Route Handler is the interim in-request worker: after the commit the same request
runs the session's own result-snapshot, history and rank jobs (`driveFinalizationJobs`, bounded,
idempotent), and every status read runs whatever is still outstanding, so a lost request still
finishes and the results view reads the generated snapshot. Online only; the dev stage toggle is
mock-only.

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
- **Real mode today (#399):** online only. The sync status and session integrity read the server;
  downloads and offline writes are not connected (see "Device, sync and batch (#399)" above).

---

## 10. Database

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
