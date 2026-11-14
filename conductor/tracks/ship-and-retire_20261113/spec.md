# Track specification: Ship the Go stack and retire Supabase

**Track ID:** ship-and-retire_20261113 · **Type:** chore · **Priority:** medium (order 12 of 12) · **Created:** 2026-11-13
**Depends on:** all earlier tracks · **Decisions:** B-10, B-20, D-2026-11-13-08, D-2026-11-14-01 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves production to the beta stack once the Go API is ready, then removes what it replaced.

## Requirements

### R1: Readiness

Every area moved; regression suite passes against the beta stack; monitoring and alerts live.

**Accepted when:**

- [ ] Owner signs off readiness

### R2: Ship

Merge `main` into `go-stack` one last time, then `go-stack` into `main` in one owner-reviewed PR after `make check` (B-20); final data copy Supabase → Railway production, account import, production domains moved to the new project; the old project and Supabase kept untouched until sign-off.

**Accepted when:**

- [ ] Rollback rehearsed

### R3: Retire

Remove moved Route Handlers and `packages/db` services; move the regression suite to local Postgres + Go; schema ownership decided; Supabase removed after sign-off.

**Accepted when:**

- [ ] TypeScript copies of Go-only rules deleted on `go-stack` and gone from `main` after the merge ([D-2026-11-13-08](../../../docs/mvp/decisions.md#d-2026-11-13-08); [rule map](../rule-cases_20261113/spec.md#where-the-rules-live)); the shared queue and matchmaking rules run from the Go WebAssembly build (rule-cases R7, [D-2026-11-14-01](../../../docs/mvp/decisions.md#d-2026-11-14-01)), with no TypeScript copy left
- [ ] UI updated on `go-stack` where a screen ran a deleted rule: setup form previews, `@rotra/schema` form checks, offline payments amount, mock mode per area. Each through the mockup first (mockup change on `main`)
- [ ] Docs updated: architecture, AGENTS, coding conventions, observability (including AGENTS rule 6 on `@rotra/schema`)

## Scope

**In:** The above.

**Out:** New features.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
