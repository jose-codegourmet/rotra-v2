# Queue app: player names read club nickname › nickname › full name everywhere

Status: NEW
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `nameStack`, `subNames`, `faceNames`, `playerTile`, `swapPicker`, `faceTeam`, `courtSides`, `queueCard`, Players cards (`.pc3-name`), `.nm-l`
Route: /sessions/[id] and every Queue Master screen with player labels
Screen ID: Q-CONSOLE, Q-POOL, Q-COURTS dialogs
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player name label (all face and tile variants)
Supersedes: none
Superseded by: none

## What changed
- Every player label on the Queue Master's screens shows, top to bottom, the **club nickname**, **nickname** and **full
  name**: the first present one is the label, the others sit under it in smaller lines, each shown once.
- On faces (court pictures, queue cards) a player with no nicknames shows the first name as the label and the full name
  under it; on a narrow court the smaller lines hide.
- Player picker tiles (Replace, Choose a player, Request a match) also lost the level text and gained the level ring and
  games badge.
- Inline text (compact "A & B" rows, sentences) keeps one short name. Public pages keep the player's own account name.

## Why
- Owner, November 26, 2026: "all player labels here should display names like this in this heirarchy CLUB NAME, NICK NAME,
  FULL NAME", then "Yes, everywhere"; artifact comment "add the skill border plus games count, remove the skill label".

## Like for like
- Compare at: 375 px and 1280 px, dark and light: Courts, Main Queue, Upcoming, Players, Suggested match, Replace, Edit lineup.

## Docs updated
- screens/product/modules/queue/session-console.md (player names).
