# Queue app: queued match cards are at least 450 px wide

Status: TICKETED — #1061
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `QUEUE_TILE_MIN`, `queueCols()`
Route: /queue/sessions/s-tonight?tab=queue (and the Courts tab's Upcoming queued matches row)
Screen ID: Q-QUEUE, Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: queue match card grid (no new component)
Supersedes: none
Superseded by: none

## What changed
- Before: as many columns as fit tiles of 220 px or more (about 4 at 1280 px).
- After: tiles of 450 px or more (300 px first, raised to 450 px the same day): 2 columns at 1280 px, 1 at 1024 px, 1
  full-width column on phones. In slide mode each card is 450 px (86% of the width on phones). The Courts tab's
  Upcoming queued matches row uses the same grid, so it shows fewer cards per row too.
- Generate Queue drafts keep their own 230 px minimum.

## Why
- Owner artifact comments, November 19, 2026, on the Main Queue cards: “a card should be a minimum of 300px”, then
  “cards should be a minimum of 450”.

## Like for like
- Compare at: 375 px, 1024 px and 1280 px, dark and light; Main Queue and the Courts tab's queued row.

## Open
- Whether the Generate Queue draft tiles should also be at least 450 px.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (Layout)
- docs/screens/product/modules/queue/session-console.md (Upcoming queued matches)
