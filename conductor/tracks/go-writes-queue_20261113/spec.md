# Track specification: Queue writes and offline contract in Go

**Track ID:** go-writes-queue_20261113 · **Type:** refactor · **Priority:** critical (order 9 of 12) · **Created:** 2026-11-13
**Depends on:** go-writes-admin-player · **Decisions:** B-01, B-02, B-04, D-2026-11-11-04 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The Queue is the main v1 product and works offline. Its writes must accept the device outbox replay exactly as today.

## Requirements

### R1: Offline contract

Idempotent `operationId`, revision checks with the same 409 for Q-CONFLICT, `GET /api/sync`, `POST /api/sessions/[sessionId]/roster/batch`, ordered replay.

**Accepted when:**

- [ ] The device outbox replays against Go with no false conflicts (outbox tests + a scripted replay)

### R2: Session, roster, matches, queue

All session commands: preparation, roster and presence, join requests, match control, match requests, Generate matches add, results, finalization, cancel/delete.

**Accepted when:**

- [ ] Characterization tests pass for every command
- [ ] Every rule passes its shared cases first

### R3: Money

Cost, payments, mark-all, amounts, inventory.

**Accepted when:**

- [ ] Money cases pass; owner signs off the money port (stop and ask)

### R4: Outbox events

Each write appends its live-update event in the same transaction (used by the live-updates track).

**Accepted when:**

- [ ] Event written iff the write commits

## Scope

**In:** All Queue write routes.

**Out:** `uploadOperations` / `sealStream` (not built for MVP).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
