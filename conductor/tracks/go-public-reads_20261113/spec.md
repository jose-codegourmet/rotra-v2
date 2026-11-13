# Track specification: Public reads in Go

**Track ID:** go-public-reads_20261113 · **Type:** refactor · **Priority:** high (order 5 of 12) · **Created:** 2026-11-13
**Depends on:** beta-stack · **Decisions:** B-01, D-2026-11-09-09 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

Public reads need no sign-in, carry the most traffic, and prove the area-by-area move end to end. The session page snapshot cache lands here.

## Requirements

### R1: Player public reads

Leaderboard and search, public player pages, RTR ID lookups, public club page, profile banners and characters lists, ranking settings read.

**Accepted when:**

- [ ] Characterization tests pass against the Go handlers
- [ ] Masked/visibility rules unchanged (D-2026-11-09-07)

### R2: Public session page

Public session reads (`/api/public-sessions/*` on Queue and Player) with the shared snapshot cached ~10 s in two versions (masked visitors, signed-in names) per D-2026-11-09-09.

**Accepted when:**

- [ ] One database read per snapshot window under concurrent refreshes
- [ ] Unpublished results never in the data

## Scope

**In:** Public GET routes in Queue and Player.

**Out:** Signed-in reads; Writes.

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
