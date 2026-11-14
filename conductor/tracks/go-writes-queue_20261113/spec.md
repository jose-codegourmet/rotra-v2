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

### R1a: Device time and sent lineups (owner, 2026-11-13; [rule-cases Q2/Q3](../rule-cases_20261113/spec.md#owner-answers-2026-11-13))

- **Time.** Replay uses the command's `recordedAt` as `now`, checked against the schedule (inside the
  session plus a grace period, not after receipt, in order per match and court, inside the court's
  booking window). A time that doesn't fit goes to Q-CONFLICT. Grace period and checks need owner OK (backlog [BL-2](../../tracks.md#backlog)).
- **Lineups.** Auto Queue, Regenerate and Suggest send the lineups the device made instead of `n`;
  the server checks them with the shared match guards and no longer generates. Its own ticket (backlog [BL-3](../../tracks.md#backlog)), before
  the port: the Go side merges into `main`, rule changes follow the rules versions of B-22, the device side lands on `go-stack` (B-20), so the current
  apps keep sending `n`. Old-shape outbox commands (`n` only) keep the old path until they drain.

- **Rules version (B-22).** Start stamps `rules_version` on the Queue Session (migration: stop and ask
  before applying): the highest version both the Go API and the live `rules-manifest.json` carry, capped
  by `RULES_VERSION_MAX` (rule-cases G14). Every command, online or replayed, runs through `rules.For(session.rulesVersion)`.
  A retired version is rejected and the session moves to the current version at its next sync, with a
  notice to the Queue Master (mockup first for the notice). See [rule-cases: Rules versions](../rule-cases_20261113/spec.md#rules-versions-b-22).

**Accepted when:**

- [ ] Start stamps the rules version; replay uses the session's version, not the latest
- [ ] With the manifest lacking the newest Go version, or unreadable, Start stamps the last confirmed version
- [ ] A retired version is rejected and the session moves to the current version with a notice
- [ ] Replayed offline changes keep the device's time; out-of-schedule times reach Q-CONFLICT
- [ ] The server stores exactly the lineups the device showed; old-shape commands still replay

### R2: Session, roster, matches, queue

All session commands: preparation, roster and presence, join requests, match control, match requests, Generate matches add, results, finalization, cancel/delete.

**Accepted when:**

- [ ] Characterization tests pass for every command
- [ ] Shared rules come from `internal/rules` as built by the rule-cases track (R5), not ported again; Go-only rules (rule-cases bucket 2) port their Vitest cases as Go tests

### R3: Money

Cost, payments, mark-all, amounts, inventory. Go only (owner, 2026-11-13): the device records marks offline and Go computes amounts on sync; the offline "last synced amount" screen change goes through the mockup first (backlog [BL-4](../../tracks.md#backlog)).

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
