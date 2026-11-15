# Track specification: Live updates

**Track ID:** live-updates_20261113 · **Type:** feature · **Priority:** high (order 10 of 12) · **Created:** 2026-11-13
**Depends on:** go-writes-queue (events), beta-stack (B-12 result) · **Decisions:** B-08, B-12 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The reason for the Go API: screens update by themselves. Refresh stays as the fallback, and what each person may see doesn't change.

## Requirements

### R1: Stream

One stream per signed-in screen (and visitors on public session pages), fed by the outbox events through in-process fan-out on Postgres notifications.

**Transactional outbox ([B-26](../../../docs/backend/open-decisions.md#settled)).**

- The events table (written in the same transaction as each write, go-writes-queue R4) is the record. A publisher in the Go API reads the events after the last id it pushed and publishes them to an in-memory pub/sub hub with topics per session, club and player; each screen's stream subscribes to its topics.
- `NOTIFY` is only a nudge to read now. The listener holds **one direct (unpooled) connection**; PgBouncer doesn't support LISTEN/NOTIFY. All other queries use the pool.
- On start and after any reconnect the publisher reads from the table again, so a missed nudge loses nothing. No delivery-status or retry table.
- Phones reconnect with their last event id (`Last-Event-ID`) and get one "changed, now at #M" per topic that moved.
- On deploy the old instance closes its streams cleanly so phones reconnect to the new one.
- During the beta, writes through the beta's Route Handlers (areas not moved yet) add events too, so those screens update live.
- A separate broker only when the API runs more than one instance.

**Snapshot versions ([B-25](../../../docs/backend/open-decisions.md#settled)).** Each live message carries the session's new event id. The screen re-reads asking for at least that id; the session snapshot cache (D-2026-11-09-09) is keyed by session + view (visitor or signed-in) + event id, so an older cached copy is rebuilt once (one build per version, e.g. `singleflight`) and shared. One copy per session and view in the API's memory: a newer version replaces the older one, slots unread for about 10 minutes are dropped, and a size cap (about 64 MB) drops the least recently read copy first. The app client puts the version in the request, never in the TanStack Query key.

**Accepted when:**

- [ ] Event reaches a connected screen in under a second on staging
- [ ] Reconnect resumes from the last event id
- [ ] A reconnect with an id older than the kept events (B-34, 7 days) gets "changed" for every topic and the screen re-reads
- [ ] The listener uses a direct connection; with the listener cut (or the database restarted), events committed meanwhile still reach connected screens after it reconnects
- [ ] An API restart mid-session: phones reconnect and catch up with no manual refresh
- [ ] A write through a beta Route Handler reaches a connected screen
- [ ] A re-read right after a live message returns the new snapshot, never the cached older one
- [ ] Many screens re-reading the same new version cause one snapshot build
- [ ] The cache holds at most one copy per session and view and stays under its size cap; API memory is on the Grafana dashboard

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
