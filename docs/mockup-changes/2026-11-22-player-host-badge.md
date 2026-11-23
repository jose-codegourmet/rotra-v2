# Player profile Clubs card shows a Host badge for clubs where the player is a trusted host

Status: IN MOCK APP — #1007
Date: 2026-11-22
App: player
Mockup: apps/mockup/player-app/rotra-player.html › P-PROFILE › clubsPanel() (own Home and another player's profile)
Route: /players/[playerId] and /home (Your clubs)
Screen ID: P-PROFILE
Artifact: none
Components: player-clubs-card
Supersedes: none
Superseded by: none

## What changed
- Each club row in the Clubs card gains a green **Host** chip under the club name when the player is currently a trusted host of that club.
- Seed: Miguel (`u1`) is a trusted host of Lahug Smash Club, matching the Queue prototype's Trusted hosts list; his other club shows no badge.

## Why
- Epic #1002 (owner, November 22, 2026): when a saved player is linked to a ROTRA account, their public profile Clubs section shows a **Host** badge for each club where they are currently trusted. Removing the trusted status removes the badge, not the membership. Informational only ([D-2026-11-22-01](../mvp/decisions/2026-11-22.md#d-2026-11-22-01)).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: club with the badge; club without; own (“Your clubs”, joined-via line under the chip) and another player's card; badge absent wherever the Clubs card is not shown (private profile before sign-in, always-private).
- Copy: “Host”
- Tokens: existing accent chip (`.chip.ok`)
- Known differences: none

## Reuse plan
- Reuses as is: Chip (accent tone)
- Extends: PlayerClubsCard — `isHost` on a club row
- New: none
- Shares work with: logs of epic #1002 | none

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md (clubs on the profile)
- Database design: docs/database_design/product/player-information/modules/identity.md (derived `isHost`)
- Screen docs: docs/screens/product/modules/player-information/profile.md (Clubs card)

## Real app work
- Done in #1007: `PlayerClubsCard` `isHost` (stories, meta); `PlayerClub.isHost` in `@rotra/data/player-club/fetchers` (mock reads `clubTrustedHosts`); real mode `readHostClubIds` in `packages/db/src/queue/club-hosts.ts` used by `readPlayerClubs` and `readMyClubs` (no new request, no schema change).
