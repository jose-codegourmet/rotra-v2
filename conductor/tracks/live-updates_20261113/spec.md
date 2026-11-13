# Track specification: Live updates

**Track ID:** live-updates_20261113 · **Type:** feature · **Priority:** high (order 10 of 12) · **Created:** 2026-11-13
**Depends on:** go-writes-queue (events), beta-stack (B-12 result) · **Decisions:** B-08, B-12 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The reason for the Go API: screens update by themselves. Refresh stays as the fallback, and what each person may see doesn't change.

## Requirements

### R1: Stream

One stream per signed-in screen (and visitors on public session pages), fed by the outbox events through in-process fan-out on Postgres notifications.

**Accepted when:**

- [ ] Event reaches a connected screen in under a second on staging
- [ ] Reconnect resumes from the last event id

### R2: Authorization

A screen receives events only for what it may read (club, session, own player, admin).

**Accepted when:**

- [ ] Tests per audience; masked-visitor pages get no private data

### R3: Apps

One small client per app that invalidates the matching TanStack Query keys; the Refresh bar, pull-down and tab-return refresh stay.

**Accepted when:**

- [ ] No layout change; works with the stream off (fallback)

## Scope

**In:** Stream endpoint, fan-out, client invalidation.

**Out:** Push notifications; A message broker (only if measured).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
