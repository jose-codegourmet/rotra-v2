# Track specification: Side-by-side beta stack

**Track ID:** beta-stack_20261113 · **Type:** chore · **Priority:** high (order 4 of 14) · **Created:** 2026-11-13
**Depends on:** go-api-foundation · **Decisions:** B-05, B-10, B-18, B-20, B-41 ([register](../../../docs/mvp/decisions/2026-11-13.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The Go API is built and tested next to the current apps, with real-mode screens, before anything ships. The current Vercel project and Supabase stay untouched.

**Testing during the move ([B-52](../../../docs/backend/open-decisions.md#settled)).** Until every area is in Go, checks run **locally**: the apps (`pnpm dev`) with `ROTRA_GO_API_URL` pointing at a local Go API, both on one local Postgres. No live environment, no database URL outside Railway. Live checks on Railway and Vercel run once, in [staging-verification](../staging-verification_20261117/spec.md), and what they find is logged as bugs. R1, R3 and the live parts of R4 moved there on 2026-11-17.

## Requirements

### R1: Second Vercel project (moved to staging-verification R1)

Same repo and apps, built from the long-lived `go-stack` branch (created off `main` in this track, B-20), real data mode, domains `queue-beta`, `player-beta`, `admin-beta`.rotra.club, cross-app URLs pointing at the beta domains.

**Accepted when:**

- [ ] `go-stack` branch exists (backlog [BL-5](../../tracks.md#backlog)); the beta project builds it and the current project still builds `main`
- [ ] The three beta apps load in real mode

### R2: Env-gated forwarding

Each app's `proxy.ts` forwards the `/api/*` paths of **moved areas** to the Go API only when `ROTRA_GO_API_URL` is set; the list of moved areas is one setting. The shared `vercel.json` is not changed. Per [B-30](../../../docs/backend/open-decisions.md#settled) (amends B-05, which used `next.config` rewrites), the forwarded request carries the secret proxy header `ROTRA_PROXY_SECRET` and the client IP. Per [B-32](../../../docs/backend/open-decisions.md#settled), with `ROTRA_GO_API_URL` set `proxy.ts` forwards moved paths first, checks sign-in only with Go's pass and never calls Supabase (everyone is signed out before go-sign-in), and matches moved paths on whole path segments. Per [B-46](../../../docs/backend/open-decisions.md#settled), each forwarded call times out after 10 seconds with no retry, and the apps show their existing offline / network error.

**Accepted when:**

- [ ] Without the variable, behavior is identical to today (current project)
- [ ] With it, a moved path reaches Go; an unmoved path still reaches its Route Handler
- [ ] The beta loads public pages with no Supabase keys set
- [ ] A moved path reaches Go while its Route Handler file still exists
- [ ] Moving `/api/sessions` doesn't catch `/api/sessions-export` (whole-segment match)
- [ ] With Go stopped or hanging, a forwarded call fails within 10 seconds and the screen shows the existing offline / network error; Queue keeps working on a downloaded session
- [ ] Go sees the real client IP through the forwarding; a direct call with a faked `X-Forwarded-For` and no secret is not trusted, and gets 404 except `/healthz` and the stream-ticket route

### R3: Beta data (moved to staging-verification R1)

Railway Postgres in staging starts from a copy of the Supabase database. Route Handlers in the beta project use that database too, so moved and unmoved areas see the same data.

**Sign-in on beta is Go only ([B-24](../../../docs/backend/open-decisions.md#settled)).** The beta never signs anyone in through Supabase Auth:

- The beta Vercel project holds **no Supabase keys** (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`). Any Supabase call left in a beta Route Handler fails with an error instead of reaching real users' logins.
- Until [go-sign-in](../go-sign-in_20261113/spec.md) lands, the beta serves only what needs no sign-in (public pages and reads). Signed-in areas are tested on beta once Go owns sign-in.
- Route Handlers that still write to Supabase Auth (the Admin player password reset and player email edit, until [go-writes-admin-player](../go-writes-admin-player_20261113/spec.md) moves them) fail on beta by design; they are tested there once they move to Go.
- Real users are not given the beta domains until go-sign-in is done.

**Accepted when:**

- [ ] Copy rehearsed and documented; row counts compared
- [ ] Beta Route Handlers work against Railway Postgres
- [ ] The beta Vercel project has no Supabase variables in any environment (checked in the Vercel dashboard and recorded in the plan)
- [ ] A Supabase-backed action on beta (for example sign-in before go-sign-in) returns an error and changes nothing in Supabase

### R4: Live stream on the ticket route (B-41)

Per [B-41](../../../docs/backend/open-decisions.md#settled) (replaces B-12): the app's `/api/*` issues a short, single-use stream ticket through `proxy.ts`, and the browser opens the stream straight on `api-beta.rotra.club`. No stream goes through `proxy.ts`.

**Accepted when:**

- [ ] A local app gets a ticket through `proxy.ts` and opens the stream on the Go API (the hour-long run on staging is in staging-verification R3)
- [ ] A used, expired or forged ticket is refused
- [ ] CORS allows only the app domains, on the stream route only
- [ ] No stream request goes through `proxy.ts` (the Vercel log check is in staging-verification R3)

## Scope

**In:** Forwarding, the stream ticket route and stream, local checks. The env-gated forwarding (R2) merges into `main`; they are inert without `ROTRA_GO_API_URL`.

**Out:** Moving any area; Shipping to production; the Vercel project, `go-stack` branch and data copy (staging-verification R1).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)). Go stream endpoint is TDD; the rest is infrastructure and frontend config.
