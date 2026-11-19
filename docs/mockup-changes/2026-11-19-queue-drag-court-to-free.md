# Queue app: drag a busy court's drawing onto a free court to move the match

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtsPane()` (`data-free-court`), court drag (`cdrag`, `cdLift`, `cdMove`, `cdEnd`)
Route: /queue/sessions/s-tonight (Courts tab)
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court card (drag source and drop target), drag ghost (reuse the swap ghost)
Supersedes: none
Superseded by: none

## What changed
- The court drawing on a Getting ready or Playing court can be dragged (grab cursor). Mouse: the drag starts after 6 px;
  touch: press and hold, then drag. A tap still opens the match.
- While dragging, every free open court gets a dashed accent outline; the one under the pointer turns solid with a
  tint. Dropping there moves the match, as Move match does (Playing keeps playing with the same start time). Toast
  “Match 16 moved from Court 1 to Court 3 · getting ready” (or “· still playing”).
- A two-court match opens Move match with the dropped court already picked, so a second one can be chosen.
- The ⋯ menu and dialog buttons stay for keyboard and screen-reader use.

## Why
- Owner artifact comment, November 19, 2026, on a playing court: “would it be possible if I drag the badminton court and it
  transfers to a vacant court?”

## Like for like
- Compare at: 375 px and 1280 px, dark and light; mouse and touch; drop on a free court, on a busy court (nothing), on
  nothing (nothing); a two-court match; a tap without dragging.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (court cards)
