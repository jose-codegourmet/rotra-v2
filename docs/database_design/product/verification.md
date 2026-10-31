# Disposable database verification

**Last verified:** 2026-10-31 on a local, throwaway PostgreSQL 15.14 cluster (no Supabase project, no
shared database).

**Status:** F07.19 evidence for the drafted schema. It proves the single migration history rebuilds
and that the database enforces the rules below. It does **not** approve any migration for a real
project; each still needs the sign-off in [coding conventions §13](../../coding-conventions.md#13-database-later-epic).

## Tools

| File | Purpose |
|---|---|
| `packages/db/scripts/disposable-db.sh` | `rebuild` (drop/create, `prisma migrate deploy`, drift check, SQL-only object counts), `seed`, `check`, `all` |
| `packages/db/prisma/fixtures/fictional.sql` | Deterministic fictional data: two clubs (paid; free tester with no prices), same-name players and guests, claimed/unclaimed profiles with invented contacts, RTR IDs, a claim link, a pending contact change, sessions prepared/active/completed/invalid, a demoted waitlist entry, a join request, a device stream with a gap and an open conflict, decided and active matches with holds, costs and paid marks (₱700 and a deliberate ₱0), a finalization with facts, a snapshot, projection jobs, current rank, a guest-history attribution and a publication without Off Day |
| `packages/db/prisma/fixtures/checks.sql` | 59 checks run in one rolled-back transaction: each must be rejected (or, for the positive cases, accepted) by the database. A check that fails for the wrong reason (bad column, enum, missing ID) is reported as broken, not as a pass |

```bash
nvm use && ROTRA_DISPOSABLE_DB_URL=postgresql://postgres@127.0.0.1:55432/rotra_disposable \
  ROTRA_DISPOSABLE_CONFIRM=rotra_disposable pnpm --filter @rotra/db db:disposable all
```

Storybook and the mock store keep using `@rotra/data` fixtures; nothing here touches them.

## Target safeguards

The script refuses to run unless **all** hold, and it never reads `.env`:

- the URL host is `localhost`, `127.0.0.1` or `::1`;
- the database name starts with `rotra_disposable`;
- `ROTRA_DISPOSABLE_CONFIRM` repeats that exact name;
- the URL is not the same as `DATABASE_URL` or `DIRECT_URL`.

Verified: a Supabase-style host, the `postgres` database, and a missing confirmation each exit with
code 2 before any SQL runs. `anon` and `authenticated` are created as `NOLOGIN` stand-ins only so the
migrations' `REVOKE`s apply; Supabase-managed schemas (`auth`, `storage`) are never created or
touched, and no migration references them.

## Results

| Check | Result |
|---|---|
| Rebuild from the single history (`prisma migrate deploy`, 11 migrations) | Applied cleanly |
| Drift: `prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code` | No difference, so regeneration from the Prisma schema keeps the hand-written SQL |
| SQL-only objects after rebuild | 152 check constraints, 1 exclusion constraint, 26 triggers, 15 partial/expression indexes |
| Grants to `anon` / `authenticated` on public tables | 0 |
| Integrity checks | 59 passed, 0 failed |
| Determinism | Two full `rebuild → seed → check` runs: same IDs and relationships (identical digest over roster, facts, RTR IDs, club players, publications) |
| Restore rehearsal | `pg_dump -Fc` → `pg_restore` into a new database → 59 passed, 0 failed |

The checks cover, among others: cross-club roster/club-player/inventory/device/court links;
an entry selecting another entry's assessment; a conflict implicating another session's operation;
duplicate club names, usernames, phones, RTR IDs, roster entries, payment marks, facts, projection
sources and open contact changes; overlapping and second active sessions; level changes after lock;
decision update/delete, tied or disagreeing scores (winner-only accepted); facts from invalid
matches; finalizing an invalid session; paid clubs without prices, free terms that record money,
rewritten license amounts, negative marks (null accepted); Off Day or unselected slides in a public
copy; deletion under a cancelled expiry cycle; and deleting clubs, players, finalized sessions or
publications. Removing a player account leaves their history in place.

## Runtime role

A non-superuser role with only `SELECT/INSERT/UPDATE/DELETE` on the tables (the shape proposed for the
app's runtime connection, #243) was checked:

- updating a match decision is rejected by the append-only trigger;
- `ALTER TABLE … DISABLE TRIGGER` is refused (must be owner);
- `SET session_replication_role = replica` (which would skip triggers) is refused;
- `rotra_next_player_sequence` works only after an explicit `EXECUTE` grant.

So the migration owner must differ from the runtime role, and the runtime role must not be the table
owner or a superuser. The real Supabase roles, pooler and advisors were **not** checked.

## Query plans

With `enable_seqscan = off` (the fixtures are too small for the planner to prefer indexes otherwise),
each documented access path uses its intended index:

| Read | Index |
|---|---|
| Player history | `player_match_facts (player_id_at_finalization, played_at desc, match_id)` |
| Roster by presence | `session_players (session_id, present, id)` |
| Waitlist | `session_waitlist (session_id, club_player_id)` unique key |
| Club sessions | `queue_sessions (club_id, scheduled_start_at desc, id)` |
| Leaderboard | `player_rank_current (leaderboard_eligible, numeric_rank desc, player_id)` |
| Retention scan | `club_expiry_cycles (state, delete_public_pages_after, id)` (index-only) |
| Projection worker | `projection_jobs (status, next_attempt_at, id)` |
| Shared queue | `matches (session_id, state, queue_position, id)` |

Finding: the F07.13 waitlist order index was never chosen (Prisma cannot express the `NULLS LAST`
order the read needs), so `20261031001100` drops it. Plans on realistic volumes still need checking on
the selected project.

## Notes for implementers

- `@default(uuid(7))` is generated by the Prisma client, not by the database. Raw SQL inserts (seeds,
  workers) must supply IDs.
- Hand-written SQL relies on PostgreSQL 15+ (`NULLS NOT DISTINCT`) and the `btree_gist` extension.
- Not verified: the Supabase project itself, its runtime/migration roles, pooler behaviour, advisors,
  backups, and any service code running against a database.
