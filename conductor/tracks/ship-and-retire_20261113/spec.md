# Track specification: Ship the Go stack and retire Supabase

**Track ID:** ship-and-retire_20261113 · **Type:** chore · **Priority:** medium (order 14 of 14) · **Created:** 2026-11-13
**Depends on:** all earlier tracks · **Decisions:** B-10, B-20, B-35, B-36, B-42, D-2026-11-13-08, D-2026-11-14-01 ([register](../../../docs/mvp/decisions/2026-11-13.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves production to the beta stack once the Go API is ready, then removes what it replaced.

## Requirements

### R1: Readiness

Every area moved; [staging-verification](../staging-verification_20261117/spec.md) done (live checks, load test [B-42](../../../docs/backend/open-decisions.md#settled)) with no open blocker bug; regression suite passes against the beta stack.

**Accepted when:**

- [ ] staging-verification done; every bug it logged is fixed or the owner has marked it not blocking
- [ ] Owner signs off readiness

### R2: Ship

Merge `main` into `go-stack` one last time, then `go-stack` into `main` in one owner-reviewed PR after `make check` (B-20); final data copy Supabase → Railway production, account import, production domains moved to the new project; the old project and Supabase kept untouched until sign-off.

**Runbook ([B-35](../../../docs/backend/open-decisions.md#settled)):**

1. Pick a quiet time from the deploy-timing panel (B-26); tell clubs in advance, by hand or with the in-app notice if B-38 is built (optional).
2. Pre-check: no running Queue Session and no device with unsynced changes; otherwise wait or postpone. Prepared sessions are fine.
3. Freeze the old stack with the read-only switch (BL-8): writes refused with an "updating" message.
4. Final copy, account import, row counts compared.
5. Switch domains, smoke test; everyone signs in again.
6. Rollback = switch the domains back, only until the first real write (deadline about 30 minutes). After that, fix forward; no reverse copy.
7. Sessions finished on the old stack get `rules_version` 1. Supabase stays read-only until sign-off.

**Accepted when:**

- [ ] The whole runbook rehearsed on beta, including a rollback before the first write
- [ ] The read-only switch refuses every write on the old stack and shows the message
- [ ] The pre-check lists running sessions and unsynced devices
- [ ] Copied old sessions read as `rules_version` 1

### R3: Retire

Remove moved Route Handlers and `packages/db` services; move the regression suite to local Postgres + Go; Supabase removed after sign-off. **Schema moves to the Go API ([B-36](../../../docs/backend/open-decisions.md#settled)):** pick the Go migration tool (dependency decision, owner approves), carry the existing migration history over as its baseline, then retire Prisma migrations and `packages/db`.

**Forwarding after retire.** Before shipping, `ROTRA_GO_MOVED_AREAS` on beta is `/api`. After the Route Handlers are deleted: the variable and its check are removed and `proxy.ts` forwards every `/api/*` to Go; `ROTRA_GO_API_URL` becomes required (the apps fail at start without it); the proxy secret, client IP and 10-second timeout stay (B-30, B-46); the "everyone is signed out" rule goes. The forwarding helper already lives in `@rotra/api-proxy` (B-51, moved in beta-stack 1.3); here only the moved-areas check is deleted from it. `proxy.ts` stays, doing two things: forward every `/api/*` to Go, and send signed-out visitors on protected pages to `/login` using Go's pass.

**Accepted when:**

- [ ] TypeScript copies of Go-only rules deleted on `go-stack` and gone from `main` after the merge ([D-2026-11-13-08](../../../docs/mvp/decisions/2026-11-13.md#d-2026-11-13-08); [rule map](../rule-cases_20261113/spec.md#where-the-rules-live)); the shared queue and matchmaking rules run from the Go WebAssembly build (rule-cases R7, [D-2026-11-14-01](../../../docs/mvp/decisions/2026-11-14.md#d-2026-11-14-01)), with no TypeScript copy left
- [ ] UI updated on `go-stack` where a screen ran a deleted rule: setup form previews, `@rotra/schema` form checks, offline payments amount, mock mode per area. Each through the mockup first (mockup change on `main`)
- [ ] `ROTRA_GO_MOVED_AREAS` is gone from code, `.env.example` and every Vercel project; every `/api/*` reaches Go and an app without `ROTRA_GO_API_URL` fails at start
- [ ] No app file imports `@rotra/db`; deleting `packages/db` breaks no `proxy.ts` or page (B-51)
- [ ] Go migrations own the schema; a new migration from `apps/api` applies cleanly to a copy of production; Prisma no longer runs migrations
- [ ] Docs updated: architecture, AGENTS, coding conventions, observability (including AGENTS rule 6 on `@rotra/schema`)

## Scope

**In:** The above.

**Out:** New features.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
