# Registration invites for a club's unclaimed record

Ticket P08.9 (#757). Decision [D-2026-11-11-03](../../../../../docs/mvp/decisions.md#d-2026-11-11-03)
(guests and unclaimed profiles stay in their club). The owner signed off the feature on November 12,
2026. `migration.sql` is the `prisma migrate diff` shape for the new model followed by hand-written
CHECKs, the partial unique index, RLS and REVOKEs.

## Why

Since `20261112000100_round2_profiles_banners_invites` an unclaimed profile is a `club_players` row
with `player_id` null plus its private-intake phone: no `players` row, no RTR ID. `player_claim_links`
requires a `players` row, so a club could not issue the **Invite** registration link for its own
record. This migration adds the record-keyed link.

## What it adds (purely additive)

| Table | Rule |
|---|---|
| `club_player_claim_links` | Same columns as `player_claim_links` (`token_digest` unique 32-byte digest, `state` from the existing `player_claim_link_state` enum, issued/expires/consumed/revoked times, revision) keyed by `(club_id, club_player_id)` → `club_players(club_id, id)` ON DELETE RESTRICT. CHECKs: digest length, expiry after issue, state matches its timestamps. Partial unique index: one active link per record. Index `(club_id, club_player_id, issued_at DESC)`. RLS enabled; `REVOKE ALL … FROM anon, authenticated, PUBLIC` like `profile_banners` |

Nothing is altered, backfilled or dropped. `player_claim_links` stays for linked `players` rows (the
registration service still stages one there for a few seconds before the account exists).

## How the services use it

- `issueClaimLink` (Queue › Saved players › Invite): a club record with a phone and no `players` row
  gets a `club_player_claim_links` row (its earlier active one is revoked in the same write); a
  record without a phone is refused ("Add this player’s phone before inviting them.").
- `readClaimLink` looks the token digest up in `player_claim_links`, then here. A record link shows
  the club's name, nickname and masked intake phone, no RTR ID and no picture; `claimed` once the
  record has a `player_id` (registered through this link or independently with the same phone).
- `completeClaim` for a record link creates the `players` row as `claimed`, its private contact, the
  RTR ID allocation for the inviting club's founding location, the account mapping, links this record
  and every other club's unlinked record with the same phone, and consumes the link.

## Verification (2026-11-12)

See the ticket's PR description / worker report for the local disposable-database run and the
shared-database `prisma migrate deploy`.
