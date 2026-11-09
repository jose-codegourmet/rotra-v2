# Saved players: “Joined via” marks, and Link to saved player… on a guest's record

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players › cards and profile dialog › Link to saved player… sheet
Route: /queue/saved-players
Screen ID: Q-SAVED-PLAYERS
Artifact: none
Components: saved-player-card, player-profile-sheet, player-picker-sheet, sheet, button
Supersedes: none
Superseded by: none

## What changed
- Every saved player card shows a muted line under the name (and the profile dialog a **Joined** row): “Joined via club link”, “Joined via session link” or “Added by the club”. Seeded: Iya Mercado (club link), Andi Cruz and Lance Ybañez (session link); a ROTRA player confirmed from a join request is saved as “Joined via session link”.
- A guest's profile dialog gains a footer button **Link to saved player…** which opens the sheet “Link NAME to a saved player”: “Choose the saved player who is the same person. NAME's slots, games and payments here move to that record. Nothing merges until you pick one.”, a **Search saved players** field (“Name, nickname or RTR ID”) and the saved-player list (picture, name, RTR ID or “Guest”, identity chip), **Back** to the profile. Picking one merges the guest into that record (slots, waitlist spots, games, requests and payments re-pointed; the guest row hidden) with the toast “Linked to NAME”.
- The join-request **Link** / **Not them** prompt for a phone match is in 2026-11-09-queue-qm-requests-tabs.

## Why
- D-2026-11-09-06: “Registering through a club's link or a session link adds the player to that club's Saved players, marked ‘Joined via club link’ or ‘Joined via session link’.” … “The QM can also link by hand (‘Link to saved player…’) when the guest left no phone. Nothing merges automatically.”

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: the three Joined via lines on cards and in the dialog; the Link button only on guests (not on unclaimed or registered players, and not when the dialog was opened from inside another dialog); link sheet with results, with a search filter, and empty (“No saved player matches.”); after linking, the guest card is gone.
- Copy: “Joined via club link”; “Joined via session link”; “Added by the club”; “Joined”; “Link to saved player…”; “Link NAME to a saved player”; “Choose the saved player who is the same person. NAME's slots, games and payments here move to that record. Nothing merges until you pick one.”; “Search saved players”; “Name, nickname or RTR ID”; “No saved player matches.”; “Back”; toast “Linked to NAME”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `sheet/`, `button/`, `text-input/`, `avatar/`, `identity-chip/`
- Extends: `saved-player-card/` (joined-via caption); `player-profile-sheet/` (Joined row, Link to saved player… footer button); `player-picker-sheet/` (a saved-player list variant for linking)
- New: none
- Shares work with: 2026-11-09-queue-qm-requests-tabs, 2026-11-09-player-registration-from-links, 2026-11-09-player-your-clubs

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — guest linking by the QM
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `club_players.joined_via`, `linked_to_club_player_id`
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Joined via, Link to saved player…; docs/product-terms.md — Club invite link, Joined via, Guest linking

## Real app work
- `club_players.joined_via` in the saved-player read model and card; the link sheet and an auditable merge operation (re-point `session_players`, waitlist, participations, payments; soft-remove the guest row) behind **Link to saved player…**.
