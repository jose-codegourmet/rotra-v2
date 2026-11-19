# Queue app: the Players card's Current and Total are buttons

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `playersPane()` (`.pc3-games`), action `showInQueue`
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-CONSOLE, D-SET-GAMES
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: live player card (two small buttons in the games strip)
Supersedes: none
Superseded by: none

## What changed
- The games strip is two bordered buttons instead of one plain strip with a divider. Each label has an icon (Current: a
  pencil; Total: an arrow); hover turns the border and background accent; keyboard focus shows a ring.
- **Current** opens Set games played (D-SET-GAMES) for that player. Tapping it never selects the card.
- **Total** opens the Main Queue in grid mode with the player's name in the queue search, so their queued matches are
  highlighted and the rest dimmed.

## Why
- Owner artifact comment, November 19, 2026, on a Players card: “clicking on ‘current’ actually opens the edit game and also
  make sure that the boxes look clickable”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; hover and focus; Current to Set games played; Total to the Main Queue.

## Open
- What Total should open. The mockup shows the player's queued matches; say if it should do something else.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Player card)
