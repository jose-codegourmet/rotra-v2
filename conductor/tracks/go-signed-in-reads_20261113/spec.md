# Track specification: Signed-in reads in Go

**Track ID:** go-signed-in-reads_20261113 · **Type:** refactor · **Priority:** high (order 7 of 13) · **Created:** 2026-11-13
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

## Carried in from settled decisions

Fixes to the public reads, decided on November 18, 2026 ([backend decisions](../../../docs/backend/open-decisions.md#settled)). Each one changes the TypeScript and Go together and updates the golden cases in `apps/api/internal/publicreads/testdata/`.

- **B-53:** a private or always-private RTR ID answers 404 to a caller who is not signed in. A player hidden from Player Information answers 404 to every caller.
- **B-54:** one server-side masking rule for leaderboard, profile, rank and games; `/rank` gets the approved-algorithm gate; `/games` is paged.
- **B-55:** the public club read sends no invite code; masked members carry no level and no stable key. The Join button change starts in the mockup first.
- **B-56:** published results on the public session page mask private and always-private players.
- **B-60:** list `/api/leaderboard`, `/api/players` and `/api/rtr-ids` in `ROTRA_GO_MOVED_AREAS` once their signed-in siblings are in Go.

## Scope

**In:** All signed-in GET routes.

**Out:** Writes.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
