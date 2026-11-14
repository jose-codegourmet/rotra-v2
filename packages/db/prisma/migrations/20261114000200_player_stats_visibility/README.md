# Stats on your profile: show_profile_stats and show_weekly_performance

Ticket P11.6 (#828), epic #822. Mockup change
[2026-11-13-player-stats-visibility](../../../../../docs/mockup-changes/2026-11-13-player-stats-visibility.md)
(owner artifact comment, November 13, 2026). `migration.sql` is the `prisma migrate diff` output for
the two new columns (run against a disposable database migrated to the previous migration) under a
header comment. Nothing is hand-written.

## Why

Mock mode already lets a player turn off **Show my profile stats** and **Show my weekly performance**
in Privacy and contact › Stats on your profile. Real mode had no columns, so it refused the save
(“Couldn't save: this setting isn't available yet.”) and every profile read as shown. This migration
stores both switches.

## What it adds (purely additive)

| Object | Rule |
|---|---|
| `players.show_profile_stats` | boolean, not null, default true |
| `players.show_weekly_performance` | boolean, not null, default true |

Nothing is dropped, renamed or backfilled: the default keeps every existing player's stats shown.
No CHECK, trigger, index or grant: `players` already has RLS on and no anon/authenticated/PUBLIC
grants.

## How the services use it

- `readPublicProfile`, `readMyProfile` and every own-profile result (`updateMyProfile`,
  `setMyProfileBanner`) carry `showProfileStats` and `showWeeklyPerformance`, also for an
  always-private profile (the flags are not personal details). The Player app hides Latest stats on
  the profile card and the Weekly performance chart (profile and Games page) from everyone but the
  player, the same client-side check mock mode uses. The game and rank reads are not stripped on the
  server, as in mock mode.
- `setStatsVisibility` (`POST /api/me/stats-visibility`, Player): `{ showProfileStats?,
  showWeeklyPerformance?, expectedRevision }`, at least one switch. A switch left out keeps its
  value; a change checks the loaded account revision and bumps `players.revision`, like Hide me from
  Player Information. Returns `{ profile, revision }` (the saved own profile).
- Queue and Admin profile cards do not read the flags yet (ticket #829).

## Verification (2026-11-14)

Local disposable PostgreSQL 16 (`rotra_disposable` on 127.0.0.1, `scripts/disposable-db.sh all`):
29 migrations applied, no drift between the database and the Prisma schema, 182 check constraints,
1 exclusion constraint, 28 triggers, 24 partial/expression indexes, 0 tables granted to
anon/authenticated; 72 integrity checks passed, 0 failed. Both columns are boolean, not null, default
true; both seeded fixture players read both switches on. `db:validate` and `db:generate` pass. The
service and route were not run against a database. Not applied to the shared database.
