# Record games: queue_sessions.record_games and the no-result decision

Ticket Q23.8 (#976), epic Q23 (#961). Decision
[D-2026-11-18-06](../../../../../docs/mvp/decisions.md#d-2026-11-18-06); mockup change
[2026-11-18-queue-record-games-option](../../../../../docs/mockup-changes/2026-11-18-queue-record-games-option.md).
The owner authorized the proposed column for the Q23 batch on November 19, 2026. `migration.sql` is
the `prisma migrate diff` output for the new column plus hand-written SQL: two trigger functions and
one replaced CHECK, under a header comment.

**Status: applied to a local disposable database 2026-11-19; **applied to the shared database 2026-11-19** (`prisma db execute` + `migrate resolve`; `20261114000400_sign_in_tables` still held for sign-off).**

## Why

A Queue Session can run with **Record games** off: the queue, courts and minimum games work, but no
result is kept. Mock mode has it since Q23.5 (#973). Real mode had nowhere to store the choice, and
its Match done always needed a winner.

## What it changes

| Object | Rule |
|---|---|
| `queue_sessions.record_games` | boolean NOT NULL DEFAULT true. Additive: every existing session reads as recorded, no backfill |
| `queue_sessions_record_games_lock` (trigger + function) | before update, only when `record_games` changes: refused unless the row's current state is `prepared`. Modelled on `session_players_level_lock` |
| `match_decisions_kind_check` (replaced) | now `(kind = completed AND winning_team IS NOT NULL) OR (winning_team IS NULL AND team_a_score IS NULL AND team_b_score IS NULL)`. Before: completed always needed a winner. Wider only: every row the old CHECK accepted still passes |
| `match_decisions_record_games_guard` (trigger + function) | before insert: a session that records games refuses a completed decision with no winner; a session that does not refuses any winner (so it never stores a winner or a score) |

**Not purely additive:** the ticket proposed only the column. A no-result Match done cannot be stored
under the old `match_decisions_kind_check`, so that one CHECK is dropped and re-added wider in the same
`ALTER TABLE`. No table, column or row is dropped, rewritten or backfilled. Both functions are revoked
from PUBLIC. No index, grant or RLS change.

## How the services use it

- **Create / edit / read.** `createQueueSession` writes `recordGames` (left out = true; every date of
  a series gets the same value); `updateQueueSession` (prepared only) changes it when the input
  carries a boolean. `sessionDto` returns it on every Queue Master session read; `readPublicSession`
  (and the Go port in `apps/api`) returns it on the public page.
- **Match done.** `completeMatch` reads the flag from the locked session. Off: a `completed`
  decision with no winner and no score, whatever the command carries, also on sync replay. On: a
  winner is required as before.
- **Session done.** `finalizeSession` runs the same barriers and writes the one
  `session_finalizations` row. Off: the row is `done` at stage `finishing` straight away, and no
  `player_match_facts`, `club_session_player_summaries` or `projection_jobs` rows are written, so no
  result snapshot, player history or rank work follows. The ranking policy barrier still applies
  (`policy_version_id` is required).
- **Results and publication.** `readSessionResults` returns null; `publishResults` and
  `requestResultExport` answer "This session has no result slides yet."; `writeResultSnapshot`
  returns without writing. The public page's `results` is null and a Player's match history of the
  session has no matches.
- Player history, ranking, leaderboards and My sessions read `player_match_facts`, so an unrecorded
  session is absent from them without a change.

## Verification (2026-11-19)

Local disposable database `rotra_disposable_q238` on the local Supabase Postgres (127.0.0.1:54322),
`scripts/disposable-db.sh all`: every migration applied, no drift between the database and the Prisma
schema, 209 check constraints, 1 exclusion constraint, 31 triggers, 28 partial/expression indexes,
0 tables granted to anon/authenticated; 80 integrity checks passed, 0 failed, including six new ones
in `prisma/fixtures/checks.sql` (Record games off while prepared accepted, changed after Start
rejected; a no-result decision rejected on a recorded session and accepted on an unrecorded one; a
winner, and a score without a winner, rejected on an unrecorded session). `prisma validate`,
`prisma generate` and `make sqlc` (apps/api) ran; `go build ./...` passes. The services and routes
were not run against a database. Not applied to the shared hosted database.
