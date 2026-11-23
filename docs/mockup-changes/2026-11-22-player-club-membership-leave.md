# Player: Leave club says what happens to pending slot transfers

Status: IN MOCK APP — #1018
Date: 2026-11-22
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Club page › Leave club sheet (`sheets.leaveClub`)
Route: /player/clubs/<clubId> (signed in as a member; hero shows Leave club)
Screen ID: P-CLUB (Leave club confirmation)
Artifact: none
Components: confirm-sheet (copy only, in the club page container)
Supersedes: none
Superseded by: none

## What changed
- The **Leave <club>?** sheet's consequence reads "You're removed from the club's saved players. Your past games, registrations and payments stay. Any pending slot transfer you're part of in this club's sessions is cancelled, and its link stops working. If you're one of the club's trusted hosts, that ends too and your Host badge goes; rejoining doesn't bring it back." (was "...Your past games stay."). Buttons unchanged: **Cancel** / **Leave club**.

## Why
- Epic #1009 / ticket #1018; owner decisions on #1015, November 22, 2026: leaving is never blocked, registrations and payments stay, and a pending transfer the player is part of is cancelled with its link. Trusted hosts now exist (epic #1002, D-2026-11-22-01): leaving also ends the player's trusted-host status in the club, so the sheet says the Host badge goes and rejoining doesn't bring it back. Decision D-2026-11-22-07.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: the sheet open, pending, and with an error.
- Copy: the consequence line above.
- Tokens: none new.
- Known differences: the prototype's Leave club only removes the club from the demo account (and its Host badge, for Miguel in Lahug Smash Club); the real app also ends the trusted-host row and cancels the player's pending slot transfers in that club's sessions in the same write.

## Reuse plan
- Reuses as is: ConfirmSheet

## Docs updated
- club-page screen doc, players module (Club membership), identity module, database design (`club_players`), D-2026-11-22-07.
