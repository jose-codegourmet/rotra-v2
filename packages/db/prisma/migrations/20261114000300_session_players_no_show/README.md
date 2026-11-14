# No show (cancelled): session_players.no_show_at

Ticket Q20.7 (#839), epic Q20. Mockup change
[2026-11-13-queue-no-show-cancelled](../../../../../docs/mockup-changes/2026-11-13-queue-no-show-cancelled.md);
owner answers in [D-2026-11-14-02](../../../../../docs/mvp/decisions.md#d-2026-11-14-02). `migration.sql`
is the `prisma migrate diff` output for the new column (run against a disposable database migrated to
the previous migration) plus one hand-written CHECK, under a header comment.

## Why

Mock mode already lets the Queue Master mark an away player with no games as **No show (cancelled)**
on the live Players view and bring them **Back to roster**. Real mode had nowhere to store it, so the
mark was hidden there. The roster's release mechanism cannot carry it: a no show only happens after
Start, when the entry's level is locked, and the `session_players_level_lock` trigger and
`session_players_locked_check` forbid releasing a locked entry.

## What it adds (purely additive)

| Object | Rule |
|---|---|
| `session_players.no_show_at` | timestamptz(6), nullable; set while the entry is a no show |
| `session_players_no_show_check` | `no_show_at IS NULL OR released_at IS NULL`: never both released and a no show |

Nothing is dropped, renamed or backfilled; every existing entry reads as not a no show. The
level-lock trigger is unchanged (`no_show_at` is not a locked column). No index, grant or RLS change.

## How the services use it

- **Live roster.** `LIVE_ENTRY` (`src/queue/session-store.ts`, `{ releasedAt: null, noShowAt: null }`)
  is the live-roster filter everywhere: `liveRoster`, capacity and minimum counts, Start, match rules
  and auto-pairing (`matchContext`), presence and match requests, results and standings, finalization
  (below-minimum, unresolved guests, summaries), the public session page and the Player's own
  sessions. Reads by id use `isOffRoster` where they rejected released entries (roster commands,
  Move to waitlist, and the two Payments writes).
- `markNoShow` (`POST /api/sessions/[id]/roster/[rosterId]/no-show`): `{ operationId }`. Only on an
  `active` session (409 "This session is not live."); the entry must be live, away, with no games
  (counted plus Set games played adjustment) and no decided match (409 "NAME is here or has played
  tonight."), and in no waiting, On court or Playing match (409 "Remove NAME from their match
  first."). Sets `no_show_at`, bumps the entry and session revisions. Repeat-safe in effect (an
  entry already marked returns the same result).
- `undoNoShow` (`DELETE` on the same path): clears `no_show_at`; 409 "The roster is full. Free a
  slot to bring someone back." while the live roster is at capacity.
- Both return `{ name, count, capacity }` for the toasts. The roster read (`GET …/roster` and the
  roster batch reply) adds `noShows`: the session's no-show entries, oldest first, each the roster
  entry DTO plus `noShowAt`.
- Payments: a no show is off the list and out of the fee split while marked (the list reads the live
  roster); their `session_payment_marks` row is kept and shows again after Back to roster.

## Verification (2026-11-14)

Local disposable PostgreSQL 16 (`rotra_disposable` on 127.0.0.1, `scripts/disposable-db.sh all`):
30 migrations applied, no drift between the database and the Prisma schema, 183 check constraints,
1 exclusion constraint, 28 triggers, 24 partial/expression indexes, 0 tables granted to
anon/authenticated; 74 integrity checks passed, 0 failed, including two new ones in
`prisma/fixtures/checks.sql`: an entry both released and a no show is rejected
(`session_players_no_show_check`), and `no_show_at` on a level-locked live entry is accepted.
`db:validate`, `db:generate` and `tsc --noEmit` for `@rotra/db` pass. The services and routes were not
run against a database. Not applied to the shared database.
