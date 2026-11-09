# Make match asks for confirmation on a court, with Arrange to balance

Status: TICKETED — #586
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › live session › Players tab › pick players › Make match
Route: /queue/sessions/[sessionId]
Screen ID: Q-POOL
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: confirm-make-match sheet, court (pitch), player face with games badge
Supersedes: none
Superseded by: none

## What changed
- Before: **Make match** immediately added the picked players to the end of the queue, teams balanced by level.
- After: **Make match** opens the sheet **Make this match?** ([D-MAKE-MATCH](../screens/product/dialogs.md#d-make-match--confirm-a-match-from-picked-players)): the court drawn with Team A left and Team B right; each face has a games-played badge and a small skill-level label under the short name (“Int Mid”, “Adv Low”, tinted per band; “No level” when unassigned); a line “Team A level N · Even / D apart · Team B level N”. Teams start in **pick order**. Buttons **Cancel**, **Arrange to balance** (applies the existing Make match balancing; shows “Arranged to balance the teams by level.”) and primary **Make match** (adds to the end of the queue, clears the selection, same toast as before). Works for every format size, 1 v 1 to 5 v 5 (tall court for 4 v 4 and 5 v 5).

## Why
- Owner comments (November 9, 2026): "should open a confirmation dialog that shows the court layout with their x games played layout on the avatars and add a button called 'arrange to balance'" and "show skill level in labels".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: pick order (no notice); after Arrange to balance (ok notice); each format 1v1, 1v2, 2v2, 3v3, 4v4, 5v5; player with no level.
- Copy: title “Make this match?”; “FORMAT · added to the end of the Main Queue. The number on each face is that player's games so far.”; “Team A level N”, “Even” / “D apart”, “Team B level N”; “Arranged to balance the teams by level.”; buttons “Cancel”, “Arrange to balance”, “Make match”.
- Tokens: existing tokens; the level label (`.pf-lv`) uses fixed band tints from the artifact (blue / yellow / red on a dark pill), as in the approved artifact.
- Known differences: none

## Reuse plan
- Reuses as is: court drawing (`pitch` + court SVG), `pf` faces with the `pf-g` games badge, sheet shell, notice
- Extends: `pf` face gets a level label
- New: the confirm sheet (D-MAKE-MATCH)
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/queueing/README.md — Make match (confirmation, pick order, Arrange to balance)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/session-console.md — Q-POOL; docs/screens/product/dialogs.md — D-MAKE-MATCH

## Real app work
- Make match opens a confirm sheet holding the teams in pick order; Arrange to balance calls the existing balancing; confirming adds the match.
