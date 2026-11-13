# Track specification: Ship the Go stack and retire Supabase

**Track ID:** ship-and-retire_20261113 · **Type:** chore · **Priority:** medium (order 12 of 12) · **Created:** 2026-11-13
**Depends on:** all earlier tracks · **Decisions:** B-10 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves production to the beta stack once the Go API is ready, then removes what it replaced.

## Requirements

### R1: Readiness

Every area moved; regression suite passes against the beta stack; monitoring and alerts live.

**Accepted when:**

- [ ] Owner signs off readiness

### R2: Ship

Final data copy Supabase → Railway production, account import, production domains moved to the new project; the old project and Supabase kept untouched until sign-off.

**Accepted when:**

- [ ] Rollback rehearsed

### R3: Retire

Remove moved Route Handlers and `packages/db` services; move the regression suite to local Postgres + Go; schema ownership decided; Supabase removed after sign-off.

**Accepted when:**

- [ ] Docs updated: architecture, AGENTS, coding conventions, observability

## Scope

**In:** The above.

**Out:** New features.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
