# Track specification: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Type:** refactor · **Priority:** high (order 7 of 12) · **Created:** 2026-11-13
**Depends on:** go-sign-in, go-public-reads · **Decisions:** B-01 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Moves every remaining GET once sign-in exists, so screens read from Go before writes move.

## Requirements

### R1: Player reads

`/api/me/*`, account, my clubs, my sessions, player compare, signed-in public-session access (#569).

**Accepted when:**

- [ ] Characterization tests pass; own-data rules enforced

### R2: Admin reads

Clubs, players, sales views, audit events, contact-change and password-reset request lists, feature flags, ranking settings.

**Accepted when:**

- [ ] Only an active admin can read

### R3: Queue reads

Club, players, sessions (roster, matches, queue, cost, payments, results), inventory, venues, license, join requests, sync read.

**Accepted when:**

- [ ] Club scope and entitlement checks match `@rotra/db/service/authorize`

## Scope

**In:** All signed-in GET routes.

**Out:** Writes.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
