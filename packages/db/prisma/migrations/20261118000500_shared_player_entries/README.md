# Shared entries of unclaimed players, the Same person redirect and the club nickname

Ticket P15.8 (#927). Decisions [D-2026-11-16-04](../../../../../docs/mvp/decisions/2026-11-16.md#d-2026-11-16-04)
and [D-2026-11-18-03](../../../../../docs/mvp/decisions/2026-11-18.md#d-2026-11-18-03) (club nickname). The owner
answered the ticket's open points and approved this migration on November 18, 2026. `migration.sql`
is the `prisma migrate diff` shape followed by hand-written CHECKs, RLS, REVOKEs, the trigger swap and
the one data step.

## What it adds

| Object | Rule |
|---|---|
| `shared_player_entries` | One thin entry per unclaimed person: normalized `email` (unique; set while open, cleared once claimed or retired), `rtr_id` (unique, RTR format with frozen codes), creating club, founding location, sync day and sequence (unique per place and day, FK to its counter), `claimed_player_id` (unique) with `claimed_at`, `retired_at`, timestamps and revision. Nothing a club typed. RLS on; no grants to `anon`, `authenticated` or PUBLIC |
| `club_players.shared_entry_id` | Nullable FK to the entry, unique per club, indexed |
| `club_players.linked_to_club_player_id` | Nullable composite self-FK `(club_id, linked_to_club_player_id)`, only on a removed row and never the row itself (CHECK): the Same person move. Designed in sessions-roster.md, not built before |
| `player_id_allocations` trigger | `player_id_allocations_append_only` now runs `player_id_allocations_guard()`: DELETE refused, UPDATE refused unless the transaction set `rotra.rtr_id_change = 'on'` and the player, creating club, sequence and allocation time are unchanged (Admin's RTR ID change) |

## The data step

`club_players.nickname` on a linked row (`player_id` set) is the club nickname now. Rows where it
equals the linked player's `players.nickname` after `btrim` (exact, case-sensitive) were copies made
by the old add path, so they are set to null (revision bumped). Any other text stays as the club's
nickname. This is the only rewrite: no record is moved or deleted, and older phone-only unclaimed
records stay as they are (they read as Details required).

Rows touched: 2 on the local fixtures (`prisma/fixtures/fictional.sql`, counted by re-running the
UPDATE inside a rolled-back transaction after seeding). The shared database was not inspected.

## RTR ID cascade

Only two tables store the RTR ID string: `shared_player_entries.rtr_id` and
`player_id_allocations.rtr_id` (a registered person's copy). No JSON projection or snapshot holds
it. `replaceRtrId` (`packages/db/src/player/shared-entry.ts`) updates both in one transaction, raises
the new place and day's counter to at least the number, and refuses a taken RTR ID. No alias.

## Verification (2026-11-18)

Local Supabase Postgres, database `rotra_disposable_p15`, `scripts/disposable-db.sh`: `rebuild`
(every migration applied, no drift against the Prisma schema), `seed`, `check` (74 passed, 0
failed). The new CHECKs, the trigger guard (UPDATE refused without the setting, allowed with it,
DELETE and sequence changes refused) and the data step were exercised by hand in a rolled-back
transaction. Not applied to the shared database.
