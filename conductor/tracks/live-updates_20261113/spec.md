# Track specification: Live updates

**Track ID:** live-updates_20261113 · **Type:** feature · **Priority:** high (order 10 of 13) · **Created:** 2026-11-13
**Depends on:** go-writes-queue (events), beta-stack (ticket route, B-41) · **Decisions:** B-08, B-41 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The reason for the Go API: screens update by themselves. Refresh stays as the fallback, and what each person may see doesn't change.

## Requirements

### R1: Stream

One stream per signed-in screen (and visitors on public session pages), opened straight on the Go API domain with a single-use ticket from the app's `/api/*` ([B-41](../../../docs/backend/open-decisions.md#settled); never through `proxy.ts`), fed by the outbox events through in-process fan-out on Postgres notifications.

**Transactional outbox ([B-26](../../../docs/backend/open-decisions.md#settled)).**

- The events table (written in the same transaction as each write, go-writes-queue R4) is the record. A publisher in the Go API reads the events after the last id it pushed and publishes them to an in-memory pub/sub hub with topics per session, club and player; each screen's stream subscribes to its topics.
- **No skipped events ([B-48](../../../docs/backend/open-decisions.md#settled)).** The publisher reads in transaction order: events with `(xact_id, id) > cursor` and `xact_id < pg_snapshot_xmin(pg_current_snapshot())`, ordered by `xact_id, id`. The SSE event id and `Last-Event-ID` carry that position as `"<xact_id>:<id>"`; the live message still carries the session's event id as its snapshot version.
- `NOTIFY` is only a nudge to read now. The listener holds **one direct (unpooled) connection**; PgBouncer doesn't support LISTEN/NOTIFY. All other queries use the pool.
- On start and after any reconnect the publisher reads from the table again, so a missed nudge loses nothing. No delivery-status or retry table.
- Phones reconnect with their last event id (`Last-Event-ID`) and get one "changed, now at #M" per topic that moved.
- On deploy ([B-44](../../../docs/backend/open-decisions.md#settled)) the old instance stops taking streams, sends each open stream a reconnect hint with a random 1–5 s wait and closes it. Phones reconnect after that wait with their last event id; repeated failures back off up to 30 s, with the Refresh bar meanwhile.
- During the beta, writes through the beta's Route Handlers (areas not moved yet) add events too, so those screens update live.
- A separate broker only when the API runs more than one instance.

**Snapshot versions ([B-25](../../../docs/backend/open-decisions.md#settled)).** Each live message carries the session's new event id. The screen re-reads asking for at least that id; the session snapshot cache (D-2026-11-09-09) is keyed by session + view (visitor or signed-in) + event id, so an older cached copy is rebuilt once (one build per version, e.g. `singleflight`) and shared. One copy per session and view in the API's memory: a newer version replaces the older one, slots unread for about 10 minutes are dropped, and a size cap (about 64 MB) drops the least recently read copy first. The app client puts the version in the request, never in the TanStack Query key.

**Accepted when:**

- [ ] Event reaches a connected screen in under a second (locally; on staging in staging-verification R3)
- [ ] Reconnect resumes from the last event id
- [ ] Write R takes its transaction id first and inserts its event last; write E inserts first and commits last. Both reach a connected screen, and a reconnect with `Last-Event-ID` gets both (B-48)
- [ ] A write left idle in a transaction is ended by `idle_in_transaction_session_timeout`, and publisher lag shows in Grafana
- [ ] During a deploy, reconnects spread over about 5 seconds instead of landing at once; a phone that can't reconnect backs off up to 30 s and the Refresh bar still works
- [ ] Limits ([B-43](../../../docs/backend/open-decisions.md#settled)): the 51st stream from one IP and streams past the total cap are refused and the screen falls back to the Refresh bar; more than 60 tickets a minute from one IP are refused; signed-in screens are never limited
- [ ] A reconnect with an id older than the kept events (B-34, 7 days) gets "changed" for every topic and the screen re-reads
- [ ] The listener uses a direct connection; with the listener cut (or the database restarted), events committed meanwhile still reach connected screens after it reconnects
- [ ] An API restart mid-session: phones reconnect and catch up with no manual refresh
- [ ] A write through a Route Handler (area not moved yet) reaches a connected screen, locally
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
