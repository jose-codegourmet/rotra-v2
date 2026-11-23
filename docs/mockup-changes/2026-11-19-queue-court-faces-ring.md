# Queue app: faces on the court cards show the level ring

Status: IN MOCK APP — #1043
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtSides()` (`.pf.lv-*`)
Route: /queue/sessions/s-tonight (Courts tab, and other places that draw a court with players)
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court face (reuse the level colours)
Supersedes: none
Superseded by: none

## What changed
- Each player's picture on a court drawing now has a 3 px ring in the level band colour (Beginner blue, Intermediate
  yellow, Advanced red) instead of the plain white edge. A player with no level keeps the white edge. The games badge
  and name stay.

## Why
- Owner artifact comment, November 19, 2026, on the Courts tab: “show skill boards” (skill borders).

## Like for like
- Compare at: 375 px and 1280 px, dark and light; Getting ready and Playing courts; a merged two-court match.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (court cards)
