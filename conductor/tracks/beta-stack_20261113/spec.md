# Track specification: Side-by-side beta stack

**Track ID:** beta-stack_20261113 · **Type:** chore · **Priority:** high (order 4 of 12) · **Created:** 2026-11-13
**Depends on:** go-api-foundation · **Decisions:** B-05, B-10, B-12, B-18 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The Go API is built and tested next to the current apps, with real-mode screens, before anything ships. The current Vercel project and Supabase stay untouched.

## Requirements

### R1: Second Vercel project

Same repo and apps from `main`, real data mode, domains `queue-beta`, `player-beta`, `admin-beta`.rotra.club, cross-app URLs pointing at the beta domains.

**Accepted when:**

- [ ] The three beta apps load in real mode

### R2: Env-gated rewrites

Each app's `next.config` rewrites the `/api/*` paths of **moved areas** to the Go API only when `ROTRA_GO_API_URL` is set; the list of moved areas is one setting. The shared `vercel.json` is not changed.

**Accepted when:**

- [ ] Without the variable, behavior is identical to today (current project)
- [ ] With it, a moved path reaches Go; an unmoved path still reaches its Route Handler

### R3: Beta data

Railway Postgres in staging starts from a copy of the Supabase database. Route Handlers in the beta project use that database too, so moved and unmoved areas see the same data; sign-in stays on the current Supabase Auth until the sign-in track lands.

**Accepted when:**

- [ ] Copy rehearsed and documented; row counts compared
- [ ] Beta Route Handlers work against Railway Postgres

### R4: Live stream through the rewrite (B-12)

Prove a long-lived stream through the Vercel rewrite; if it fails, use the ticket fallback.

**Accepted when:**

- [ ] Result recorded in backend open decisions

## Scope

**In:** Vercel project, rewrites, data copy, the stream test.

**Out:** Moving any area; Shipping to production.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)). Go stream endpoint is TDD; the rest is infrastructure and frontend config.
