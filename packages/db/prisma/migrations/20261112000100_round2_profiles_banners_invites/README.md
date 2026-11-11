# Round 2: visibility, hide flag, profile banners, club invite code, club-only unclaimed profiles

Ticket P08.1. Decisions [D-2026-11-11-11](../../../../../docs/mvp/decisions.md#d-2026-11-11-11)
(three-level visibility, hide from Player Information, banners), [D-2026-11-09-08](../../../../../docs/mvp/decisions.md#d-2026-11-09-08)
(club invite code) and [D-2026-11-11-03](../../../../../docs/mvp/decisions.md#d-2026-11-11-03)
(unclaimed profiles stay in their club). The owner signed off the migration on November 12, 2026.
`migration.sql` is the `prisma migrate diff` output followed by hand-written CHECKs, seeds, grants
and the data backfill.

## What it adds

| Table | Column / object | Rule |
|---|---|---|
| `players` | `profile_visibility` enum `profile_visibility` (`public`, `private`, `always_private`), not null | **Default `private`** for new rows. There was no stored privacy flag before (the Private switch was mock-only), so every existing row is backfilled to `public`; nothing is dropped |
| `players` | `hidden_from_directory` boolean, not null, default false | Hide from Player Information |
| `players` | `banner_id` text, nullable, FK → `profile_banners(id)` ON DELETE RESTRICT, index | null = default banner |
| `profile_banners` | `id`, `image`, `shown`, `uploaded_at`, `number`, `deleted_at` | Same shape, CHECKs (`id` a lowercase key `^[a-z]{1,24}$` or a lowercase UUID; `image` `''`, `data:image/%` or `https://%`; `number` > 0), unique `number`, index `(uploaded_at, number)`, RLS and REVOKEs as `profile_characters`. Seeded `court`, `night`, `dusk`, `ember`, `sun`, `stripe` = numbers 1–6, `image` `''` (drawn from theme tokens by id). At least 2 shown is an Admin-service rule |
| `clubs` | `invite_code` text, nullable, unique, CHECK `^[A-Z0-9]{8,16}$` | One active code; Regenerate overwrites. Every existing club is backfilled with a random 10-character uppercase hex code (`md5(random() …)`, no pgcrypto dependency) |

## Club-only unclaimed profiles (data backfill)

Rule after this migration: an unclaimed profile is a `club_players` row with `player_id` null (plus its
`club_player_private_inputs` phone). It has no `players`, `player_private_contacts` or
`player_id_allocations` row. The `DO` block at the end moves the existing data:

1. Scope: every `players` row with `profile_state = 'unclaimed'` that is linked from at least one
   `club_players` row. Unclaimed rows with **no** club record are left untouched: the registration
   service stages a `players` row and a claim link for a few seconds before the account exists, and
   those rows must survive. The shared database held 43 unclaimed rows (2 linked from both clubs),
   45 club records, 5 active invite links and 0 contacts, pictures or experience values.
2. Guard: if any scoped row has references that cannot be moved — `player_match_facts`
   (immutable), `club_assessments` (append-only), `player_history_attributions`, `projection_jobs`,
   `player_rank_current`, `player_accounts`, contact-change or password-reset requests, social
   links — the migration raises and applies nothing, so the owner decides those rows one by one.
   The shared database had none (0 roster, assessment, fact, hold, join-request or attribution
   references to unclaimed rows), so the "keep the row, clear its RTR ID and mark it" fallback was
   not needed and no marker column exists.
3. Copy onto the club record: a missing club nickname takes the player's; a phone in
   `player_private_contacts` becomes the club record's private intake (`state = 'pending'`), and an
   intake already resolved to the unclaimed player goes back to `pending` with its phone kept.
4. Snapshots cleared, rows kept: `session_players.player_id_at_entry`, `active_player_holds.player_id`
   and `session_join_requests.player_id` that pointed at a scoped row become null; the entries stay
   attached to the club record through `club_player_id`, so sessions and games stay valid.
5. Invite links (`player_claim_links`) of scoped rows are deleted; the club reissues an invite
   against its own record once the invite service points at `(club_id, club_player_id)` (not part of
   this ticket; the Prisma model still requires `player_id`).
6. `club_players.player_id` is set to null (revision + 1), the RTR ID allocation row is deleted with
   the append-only trigger disabled for that one statement, then the private contact and the
   `players` row are deleted. `player_id_counters` are not rewound: released sequence numbers are
   never reused.

Services are **not** changed by this ticket: `resolveClubPlayerIdentity` and the player search still
create and find unclaimed `players` rows; the follow-up service tickets stop that. Until they land,
a sync of a phone-entered club player recreates an unclaimed `players` row, which this migration (run
once) will not touch.

## Fixtures and seed

`fixtures/fictional.sql`: the second "Juan Dela Cruz" is now club A's club-only record `cb…a2`
(phone in its private intake), with no `players`, contact, RTR ID or claim-link row; its roster
entry and match fact carry null global snapshots. The guest-history attribution `a8…a3` and
projection job `b0…02` now target the registered Maria (an attribution needs a registered player),
which supersedes the pair in the compare reader's README (`20261108000200`). Juan has
`profile_visibility = 'public'` and banner `night`; Maria is `private` and hidden from the
directory; both clubs have invite codes. `fixtures/checks.sql` adds rejections for an unknown
banner, deleting a used banner, a malformed banner id, duplicate and lowercase invite codes, and
accepts the `private` default and a second club's own record for the same phone.

`scripts/seed-players.mjs` now seeds the 53 mock players as club-only `club_players` rows of the
given club (ids reused), with no `players` rows or RTR IDs.

## Verification (done 2026-11-12)

- Local PostgreSQL 15, guarded disposable workflow (`scripts/disposable-db.sh all`): all 23
  migrations apply from empty, `prisma migrate diff` reports no drift, `fictional.sql` seeds, and
  all 66 `checks.sql` statements pass (the eight new checks included).
- Backfill dry run on a second disposable database built from the previous fixture (its unclaimed
  Juan has an immutable fact and an assessment): the pre-check refused with the P08.1 message and
  nothing was applied (no new columns, no `profile_banners`). With live-shaped rows instead (two
  unclaimed players with RTR IDs, club records in one and two clubs, an invite link, one phone
  resolved into an intake): applied; both rows and their allocations gone, counters untouched,
  club records unlinked with revision + 1, nickname copied, intake back to `pending` with its phone,
  invite link deleted, append-only trigger re-enabled, no drift.
- `pnpm --filter @rotra/db db:generate` and one `tsc --noEmit` on the package: clean.
- Shared database (DIRECT_URL, `prisma migrate deploy`): applied. Before: 70 players (43
  unclaimed, all with club records), 70 allocations, 37 claim links. After: 27 players (0
  unclaimed), 27 allocations, 32 claim links, 84 club-only records, 27 profiles `public`, default
  `private`, six banners, both clubs with a 10-character code, trigger enabled, no
  anon/authenticated grants on `profile_banners`, `migrate status` up to date, no drift.
