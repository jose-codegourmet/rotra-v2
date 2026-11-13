# Go API on Railway: proposal

Date: 2026-11-13 (Asia/Manila). **Status: DECIDED, November 13, 2026. B-01 to B-09 answered in the
planning session and recorded as [D-2026-11-13-01](../../../mvp/decisions.md#d-2026-11-13-01).** Two answers go
further than this proposal asked: live updates are now in scope (B-08), and sign-in includes device
sessions and offline device enrollment (B-04). See "Decision" below. Follow-ups B-10 to B-19 were
answered the same day ([backend open decisions](../../open-decisions.md)). This document doesn't authorize
migrations or new dependencies by itself; each still goes through its own ticket and sign-off.

## Decision (November 13, 2026)

| ID | Answer |
|---|---|
| B-01 | Go API, moved over one area at a time |
| B-02 | Shared test-case package: rules stay in TypeScript for the device; Vitest and Go tests run the same JSON cases |
| B-03 | Railway (Singapore) for the Go API and Postgres; Next.js apps stay on Vercel |
| B-04 | Go owns sign-in, with rate limits (account, IP, device), a signed-in device list, and offline device enrollment |
| B-05 | Each app rewrites `/api/*` to the Go API |
| B-06 | Railway Buckets for pictures, served by presigned URL (free bucket egress); no CDN for now |
| B-07 | No scheduled jobs; they stay parked |
| B-08 | Live updates for every app; Refresh, pull-down and tab-return stay as the fallback |
| B-09 | Start on the Railway Hobby plan and monitor |

The rest of this page is the proposal as written, with the live-update and device parts updated to
match the answers.

## The ask, in plain words

- Move the server code out of the Next.js apps into **one Go API**.
- Run that API and the **Postgres database on Railway** (Singapore region), instead of Vercel
  functions + Supabase.
- Let the Go API **own sign-in**, instead of Supabase Auth.
- Keep the three Next.js apps, the mockups, mock mode and every screen exactly as they are.

It originally left live updates out. The answer to B-08 adds them: live updates are the reason for
the Go API (see "Live updates" below).

## What stays exactly the same

These are v2 contracts. The Go API has to keep them, or the proposal fails.

- **Mock mode is the default.** `NEXT_PUBLIC_ROTRA_DATA_MODE` / `ROTRA_DATA_MODE` still pick mock or
  real. Only the real path changes.
- **Screens and hooks don't change.** `packages/data` fetchers, query keys and hook contracts stay
  stable ([architecture §5](../../../architecture.md#5-data-flow)). With B-05 option A, even the fetcher URLs
  stay `/api/...`.
- **Writes stay plain HTTP**, no Server Actions ([architecture §5](../../../architecture.md#5-data-flow)): the
  Queue offline outbox needs a stable HTTP API.
- **Offline (D-2026-11-11-04):** idempotent `operationId` on every write, revision checks that answer
  409 for Q-CONFLICT, `GET /api/sync`, `POST /api/sessions/[sessionId]/roster/batch`, ordered replay.
  Device enrollment is now in scope (B-04). The rest of the device-stream protocol
  (`uploadOperations`, `sealStream`) stays **not built for MVP**.
- **Sign-in rules:** club accounts sign in with a **username**. Players sign in with email and
  password. Player password recovery is **reviewed by Admin**, with no automatic email
  (D-2026-11-07-01, amended by D-2026-11-09-14). Cookies stay **host-only and per app** (#569,
  [architecture §12](../../../architecture.md#12-open-architecture-decisions)). No social login.
- **Server cost priorities (D-2026-11-09-09):** the cached session snapshot (about 10 seconds; masked
  and signed-in versions), plus a sign-in check on the server without a round trip to an auth
  provider on every refresh.
- **Observability (D-2026-11-11-01):** OpenTelemetry traces to Grafana. Go has first-class
  OpenTelemetry support.

## How it would look

```text
 Browser ── queue.rotra.club / player.rotra.club / admin.rotra.club  (Next.js on Vercel, unchanged UI)
    │
    │  /api/*  (same origin; host-only cookies as today)
    ▼
 Vercel rewrite /api/:path* ──▶ Go API on Railway (Singapore)
                                   │  verifies the app's session, authorizes (own club / own player / admin / entitlement / revision)
                                   │  runs the domain service, returns the same JSON and error shapes
                                   ▼
                                Postgres on Railway (Singapore, private network)
```

- **One Go module** at `apps/api`, so the repo map in AGENTS.md gains one app. It runs one service
  per environment.
- **Area by area (strangler).** The rewrite moves one product area at a time from a Route Handler to
  Go. Until an area moves, its Route Handler keeps running. Each move is its own ticket, with the
  same request and response shapes, proven against the existing handler.
- **Region.** Railway's Asia Southeast region is Singapore
  ([Railway regions](https://docs.railway.com/deployments/regions#region-options)), next to Vercel `sin1`.
  The added hop is Vercel function → Railway, both in Singapore. It should be measured, not assumed.
- **Database.** Railway Postgres with high availability, backups / point-in-time recovery and
  connection pooling turned on
  ([Railway PostgreSQL](https://docs.railway.com/databases/postgresql)). Prisma migrations stay the
  schema owner until the TypeScript services are retired (see "Migration path").

## Live updates (B-08)

- **What changes for people:** screens update by themselves when something changes on the server.
  The Refresh bar, pull-down and tab-return refresh stay as they are, as the fallback when the
  connection drops. No layout change, so no mockup change is needed for the live part itself.
- **What doesn't change:** what each person may see. Visitors get masked names, players see their
  own standing only, and unpublished results stay out of the page data (D-2026-11-09-04). Live
  messages only say "this changed"; the screen then re-reads through the same authorized endpoints
  and the same session snapshot cache (D-2026-11-09-09).
- **How:** every write records a small event in the same database transaction. The Go API pushes
  it to the screens that show that session, club or player. It starts on a single API instance
  with Postgres notifications, with no extra service. A second instance or a message broker is only
  added when measured load needs it (cost, B-09).
- **Offline Queue devices** keep the outbox exactly as today; live updates are only for while
  online.
- **Open:** whether a long-lived stream works through the Vercel rewrite (B-12).

## The biggest cost: two copies of the rules (B-02)

Today the rules live **once**, in TypeScript under `packages/data`, and are used in two places:
- the **device**, which runs the mock reducers over the downloaded session while offline
  (D-2026-11-11-04)
- the **server**, through `packages/db`

The decided-math tests (62 test files, e.g. `packages/data/src/match`, `queue-session`,
`session-payment`, `ranking-settings`) guard them.

A Go server means a **second copy** of every rule the server enforces. If the two copies disagree,
an offline change the device accepted comes back as a 409 on replay, and the Queue Master sees a
conflict that shouldn't exist. This is the same argument D-2026-11-08-04 used against Edge Functions
("two copies of the same rules").

Options:
- **A — one set of cases, two runners (recommended).** Each decided-math rule gets its cases as JSON
  files next to its Vitest test. Vitest and the Go tests both read the same files. A rule can't move
  to Go until Go passes every case. A change to a rule changes the shared cases first, so both sides
  fail until both are fixed.
- **B — keep rule-heavy commands in TypeScript.** The Go API handles sign-in, reads and simple
  writes. Commands that run decided math stay in Route Handlers. Fewer copies, but two backends for
  good.
- **C — port without shared cases.** Not recommended.

Money (cost estimate, payments), minimum games, queue generation and ranking are on the
[stop and ask](../../../ways-of-working.md#10-stop-and-ask) list. The #247 ranking constants are still open.
No rule moves to Go without the owner's sign-off on that rule's cases.

## Sign-in owned by the Go API (B-04)

It keeps today's rules and adds three things (B-04 answer):

- **Rate limits** on sign-in and recovery, counted per account, per IP and per device.
- **Signed-in device list:** each sign-in is a named device session. Its owner, or Admin, can see
  the list and sign one device out.
- **Offline device enrollment:** the Queue device that downloads a session registers with the
  server (the `registerDevice` part of [offline-sync](../../../database_design/product/queue/modules/offline-sync.md)),
  so the server knows which device holds which session.

Today's rules it keeps:

| Rule today | Source | In Go |
|---|---|---|
| Club account: username + password, platform owner resets a forgotten password | [architecture §8](../../../architecture.md#8-auth-real-for-queue-admin-and-player), `packages/db/src/auth/sign-in.ts` | Username is the login itself; no provider login email needed |
| Player: email + password; registration through claim links | §8, `/api/claim/[token]` | Same |
| Player recovery: request to Admin › Requests, Admin issues a secure, expiring, single-use link | D-2026-11-07-01, D-2026-11-09-14 | Same; Go issues the link |
| Admin sign-in | §8 | Same |
| Host-only cookie per app; Queue reads Player access through the Player origin | #569 | Same: each app's `/api/*` rewrite keeps its own cookie |
| Account checks on each request (provisioned / not disabled club account, enabled player, active admin) | `handleAccountRequest`, `@rotra/db/service/authorize` | Same checks, same order |

Not designed here: the **tables**. Player UUIDs are already separate from auth UUIDs
([database open decisions](../../../database_design/product/open-decisions.md)). Credential, session and
recovery-link tables need a database-design proposal first. Email verification on claim and the
password policy are already open there, and they stay open.

Moving existing accounts: there would be a one-time import from Supabase Auth with the same account
ids. Supabase stores bcrypt password hashes, so people keep their passwords. Details belong in the
tickets once B-04 is approved.

## Migration path, if approved

Each step is a ticket under an epic, in v2's usual order. Mock mode stays the default throughout.

1. **Shared rule cases** (B-02 A): JSON case files for the decided-math tests. TypeScript only, so
   it's useful even if the rest is declined.
2. **Go API skeleton** at `apps/api`: health check, tracing, error and serialization contracts
   matching `@rotra/db/service/{errors,serialize}`, and Railway staging.
3. **Reads first:** Player Information public reads (leaderboard, player pages), then signed-in
   reads, then Queue reads, using the cached session snapshot of D-2026-11-09-09.
4. **Sign-in** (only if B-04 is **B**): database-design proposal → tables → import → swap each app's
   `proxy.ts` session check.
5. **Writes, by area:** Admin → Player → Queue last. Queue writes include `operationId`, revisions,
   `sync` and the roster batch. Each is proven against the existing handler and the regression suite.
6. **Database move** (B-03): rehearse a dump/restore, then cut over with the owner's sign-off. The
   Supabase project stays untouched until sign-off. RLS (#387) becomes moot once no client reaches
   Postgres directly, but that is recorded in the database open decisions, not assumed.
7. **Retire** `packages/db` services an area at a time. The regression suite (`apps/e2e`) moves from
   local Supabase to local Postgres + the Go API.

## Existing decisions this touches

| Decision | Effect |
|---|---|
| [Architecture §12](../../../architecture.md#12-open-architecture-decisions) Hosting (settled: Vercel + Supabase) | **Reopened** for the API and database only (B-03); the Next.js apps stay on Vercel |
| [Architecture §5](../../../architecture.md#5-data-flow) Real mode: Route Handlers over `packages/db` | **Amended**: Route Handlers become rewrites to the Go API, area by area |
| [D-2026-11-07-01](../../../mvp/decisions.md#d-2026-11-07-01), [D-2026-11-09-14](../../../mvp/decisions.md#d-2026-11-09-14) Admin-reviewed recovery | **Kept**; implemented in Go if B-04 is B |
| [D-2026-11-08-03](../../../mvp/decisions.md#d-2026-11-08-03) Supabase Storage | **Amended** (B-06): Railway Buckets, presigned URLs |
| [D-2026-11-09-10](../../../mvp/decisions.md#d-2026-11-09-10) keep current + previous | **Kept** |
| [D-2026-11-08-04](../../../mvp/decisions.md#d-2026-11-08-04) pg_cron jobs; [D-2026-11-11-10](../../../mvp/decisions.md#d-2026-11-11-10) parked | **Kept** while parked (B-07) |
| [D-2026-11-09-04](../../../mvp/decisions.md#d-2026-11-09-04) never live | **Amended** (B-08): live updates added; manual refresh stays as the fallback; what a player may see is unchanged |
| [D-2026-11-09-09](../../../mvp/decisions.md#d-2026-11-09-09) cheap session page | **Amended** (B-08): "no polling, push or Realtime" gives way to live push; the cached snapshot and server-side sign-in check stay |
| [D-2026-11-11-01](../../../mvp/decisions.md#d-2026-11-11-01) Observability | **Kept**; the Go API exports the same traces |
| [D-2026-11-11-04](../../../mvp/decisions.md#d-2026-11-11-04) Offline outbox | **Amended** (B-04): device enrollment is built; the outbox and replay are kept as they are |
| AGENTS.md non-negotiable 11 (no new dependencies, Server Actions or Realtime without a decision) | **Respected**: this proposal is that decision request; Go, Railway and any Go libraries need approval |

## Scope today (for sizing)

- **145 Route Handlers:** Queue 70, Player 42, Admin 33.
- **Services in `packages/db/src`:** `queue/` (sessions, roster, matches, match requests, results,
  finalization, financials, sync), `player/` (identity, claim, profile, leaderboard, compare,
  projections, my sessions), `admin/` (clubs, licenses, password resets, player edit, sales,
  retention), `auth/`, `service/` (handler, authorize, errors, serialize).
- **28 Prisma migrations**, applied to the shared database with owner sign-off each time.
- **62 decided-math test files** across `packages/data`, `packages/schema` and `packages/ui`.

## Risks

| Risk | Mitigation |
|---|---|
| Device and server rules drift; false offline conflicts | B-02 A: shared case files; no rule moves without passing every case |
| Two backends for a long time | Area-by-area tickets with a fixed order; retire each Route Handler as soon as its area moves |
| Extra hop Vercel → Railway adds latency | Same region; measure on staging before any area moves |
| Cost goes up instead of down | B-09: measured estimate before approval |
| Sign-in move locks people out | Same account ids, bcrypt import, rehearsal on staging, Supabase kept until sign-off |
| Scope freeze (D-2026-11-07-04) | This is infrastructure, not a feature; the owner decides whether it fits before launch or after |

## Still open

Nothing. B-10 to B-19 were answered on November 13 (side-by-side rollout, sign-in tables in
[database design](../../../database_design/product/sign-in.md), live transport, no CDN, monitor Hobby, the
rule-cases package [D-2026-11-13-02](../../../mvp/decisions.md#d-2026-11-13-02), monitoring, the `railway` dev
dependency for [Infrastructure as Code](../../infrastructure.md), beta domains, `pg_stat_statements`).
