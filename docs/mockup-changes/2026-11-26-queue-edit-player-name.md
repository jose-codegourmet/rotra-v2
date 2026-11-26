# Queue app: Edit player has Full name and Club nickname for every player

Status: TICKETED — #1127
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `SHEETS.editLive` (`nameF`), `ACT.openEditLive`, `ACT.saveEditLive`
Route: /sessions/[id] (live console › Players › Edit player)
Screen ID: Q-CONSOLE, D-EDIT-LIVE-PLAYER
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: EditLivePlayerSheet
Supersedes: none
Superseded by: none

## What changed
- Edit player's Profile section starts with **Full name**.
- Unclaimed and guest profiles: editable, required, 2–60 characters, spaces collapsed; an empty name shows
  “Enter the full name, at least 2 characters.” and keeps the sheet open. Saving renames the profile everywhere.
- Registered players: read-only, with “Only NAME can change this, in the ROTRA Player app. Use Club nickname for what your
  club calls them.” Club nickname stays the club's own label for them.
- Unclaimed and guest players also get **Club nickname (optional)**, which edits their one nickname (they have no
  account yet); empty removes it and the full name shows.
- The Profile section now always shows (it held only Club nickname or the picture before).

## Why
- Owner artifact comment, November 26, 2026: “there should be edit name field”, then “hey club nickname”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light: Edit player for an unclaimed, a guest and a registered player.

## Docs updated
- docs/screens/product/dialogs.md (D-EDIT-LIVE-PLAYER)
