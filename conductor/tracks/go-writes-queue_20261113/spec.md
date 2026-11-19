# Track specification: Queue writes and offline contract in Go

**Track ID:** go-writes-queue_20261113 · **Type:** refactor · **Priority:** critical (order 9 of 13) · **Created:** 2026-11-13
**Depends on:** go-writes-admin-player · **Decisions:** B-01, B-02, B-04, D-2026-11-11-04 ([register](../../../docs/mvp/decisions.md#d-2026-11-13-01), [backend open decisions](../../../docs/backend/open-decisions.md))

## Why

The Queue is the main v1 product and works offline. Its writes must accept the device outbox replay exactly as today.

## Requirements

### R1: Offline contract

Idempotent `operationId`, revision checks with the same 409 for Q-CONFLICT, `GET /api/sync`, `POST /api/sessions/[sessionId]/roster/batch`, ordered replay.

**Accepted when:**

- [ ] The device outbox replays against Go with no false conflicts (outbox tests + a scripted replay)
- [ ] Sign-in and replay ([B-28](../../../docs/backend/open-decisions.md#settled)): after more than 15 minutes offline, replay renews the access pass first and shows no sync problem; an expired-pass answer renews once and retries
- [ ] The outbox survives sign-out and expiry, replays only under the same club account, and shows "Sign in to sync N waiting changes" until then; signing out with waiting changes asks first

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

Table design: [live-update events](../../../docs/database_design/product/live-updates.md) ([B-50](../../../docs/backend/open-decisions.md#settled)); its migration PR needs owner sign-off on the SQL (B-36).

Each write appends its live-update event in the same transaction (used by the live-updates track). Event ids come from one global id; within a session they follow commit order, because the write locks its session row before appending ([B-49](../../../docs/backend/open-decisions.md#settled)). The session's latest event id (`queue_sessions.latest_event_id`) is its snapshot version ([B-25](../../../docs/backend/open-decisions.md#settled)), so every write that changes what the session snapshot shows (details, courts, queue, roster) must append one.

**Accepted when:**

- [ ] Event written iff the write commits
- [ ] Writes that change a registered player's own results (match finished or invalid, session finalized) list them in `player_ids` (B-50)
- [ ] Two writes to the same session commit in id order, and writes to different sessions don't wait on each other (B-49)
- [ ] Each event stores its writing transaction's id (`xact_id`, `pg_current_xact_id()`) so the publisher can read in transaction order and never skips a slow write ([B-48](../../../docs/backend/open-decisions.md#settled))
- [ ] Every write that changes the session snapshot appends an event, so the snapshot version moves
- [ ] The session row keeps its latest event id; events older than 7 days are deleted by the housekeeping loop ([B-34](../../../docs/backend/open-decisions.md#settled)) and the snapshot version is unchanged

## Carried in from main (merged November 18, 2026)

Queue writes added or changed on `main` after this track was written. They are in scope for R2.

- **Replace player on a Playing match** (#840, `match-control.ts`).
- **No show (cancelled)** ([D-2026-11-14-02](../../../docs/mvp/decisions.md#d-2026-11-14-02)): no fee, club-only, after Start only.
- **Shared player entries** ([D-2026-11-16-04](../../../docs/mvp/decisions.md#d-2026-11-16-04), migration `20261118000500_shared_player_entries`): saving an unclaimed player needs an email and allocates an RTR ID; a second club entering the same email gets the same entry; a guest becomes unclaimed when an email is added.
- **New routes:** `/api/club/players/{clubPlayerId}/move` (same person) and `/club-nickname`.
- **Join request:** a guest request no longer carries a phone.

## Carried in from main (merged November 19, 2026)

Epics Q24 (#962) and Q23 (#961) added these writes on `main`. They are in scope for R2.

- **Self check-in** ([D-2026-11-09-03](../../../docs/mvp/decisions.md#d-2026-11-09-03), migration `20261118000600_self_check_in`), Player app, signed in: `POST /api/public-sessions/{slug}/check-in` (I'm here; refused when the club turned self check-in off) and `POST /api/public-sessions/{slug}/leave` (I'm leaving). Each writes its timestamp on `session_players` together with `present`.
- **I can't make it** (migration `20261118000700_drop_out_notices_session_invites`, table `session_drop_out_notices`): the player sends `POST /api/public-sessions/{slug}/drop-out`; the Queue Master answers with `POST /api/sessions/{sessionId}/requests/drop-outs/{noticeId}/keep` or `/remove`.
- **Session invite** (table `session_invite_codes`): `POST /api/public-sessions/{slug}/invite-code` returns the player's code for the session, making it on first use. The migration also adds `session_join_requests.invite_code_id`, but no service on `main` sets it yet; ask before using it.
- **Club switch:** `/api/club` accepts `selfCheckInEnabled` (Players can check themselves in).
- **Record games** ([D-2026-11-18-06](../../../docs/mvp/decisions.md#d-2026-11-18-06), migration `20261119000100_session_record_games`): `record_games` is set when a session is prepared and fixed once it starts (database trigger). With it off, Match done takes no winner or score, finishing the session writes no result snapshot, and result slides are refused. The database also guards this (`match_decisions_record_games_guard`).
- **Shared standings positions** ([D-2026-11-18-05](../../../docs/mvp/decisions.md#d-2026-11-18-05)): the Go rule is already updated on `main` with its cases and `.wasm`; nothing more for this track beyond using it.

D-2026-11-18-05, 06 and 07 are approved with details still open. Ask before porting anything the decision leaves open.

## Scope

**In:** All Queue write routes.

**Out:** `uploadOperations` / `sealStream` (not built for MVP).

## Testing

Go: strict TDD, characterization tests first for ported routes, real Postgres in tests, ≥ 80% coverage ([workflow](../../workflow.md)).
