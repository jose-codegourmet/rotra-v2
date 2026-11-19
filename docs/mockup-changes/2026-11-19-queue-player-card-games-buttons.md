# Queue app: the Players card's Current opens Set games played

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `playersPane()` (`.pc3-games`)
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-CONSOLE, D-SET-GAMES
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: live player card (two small buttons in the games strip)
Supersedes: none
Superseded by: none

## What changed
- The games strip stays one bordered rectangle with Current and Total split by a divider.
- **Current** is a button: its label has a dashed underline, its half tints on hover, and keyboard focus shows a ring. It
  opens Set games played (D-SET-GAMES) for that player and never selects the card.
- **Total** is not clickable.
- First version, the same day: two separate bordered buttons with a pencil and an arrow, and Total opened the Main Queue.
  The owner's follow-up (“one big rectangle for the 2, but only current is clickable, and remove the pencil icon, total
  is not clickable”) replaced it.

## Why
- Owner artifact comment, November 19, 2026, on a Players card: “clicking on ‘current’ actually opens the edit game and also
  make sure that the boxes look clickable”; then “one big rectangle for the 2 … only current is clickable … remove the
  pencil icon … total is not clickable”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; hover and focus on Current; Current to Set games played.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Player card)
