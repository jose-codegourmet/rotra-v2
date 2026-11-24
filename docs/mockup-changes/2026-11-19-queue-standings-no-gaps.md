# Queue app: standings positions run on without gaps (1, 1, 2)

Status: IN MOCK APP — #1057
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `standings()` (position numbering); read by the console Leaderboard, the record's Standings and Players, the Standings slide, Share leaderboard images and Your position
Route: /queue/sessions/s-tonight?tab=board
Screen ID: Q-LEADERBOARD, Q-HISTORY, Q-STANDINGS-SLIDE, Q-PUBLIC-RESULTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: live-leaderboard, session-standings, leaderboard-share-card
Supersedes: the numbering in 2026-11-18-queue-shared-standings-positions (1, 1, 3)
Superseded by: none

## What changed
- Before: the position after a shared one skipped the shared places (1, 1, 3), so the table's rows could read
  1, 3, 4, 5, 8. After: positions run on without gaps (1, 1, 2), so the rows read 1, 2, 3, 4, 5.
- Everything else from November 18 stays: same wins and losses share one position, one row per position with
  stacked faces, one row per player on the slide and share images (now numbered 1, 1, 2), "tied with N others".

## Why
- Owner artifact comment, November 19, 2026, on the console Leaderboard: “should be 1 2 3 4 5 6 7”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: shared positions at the top, middle and bottom; no ties.

## Decided math
- This amends [D-2026-11-18-05](../mvp/decisions/2026-11-18.md#d-2026-11-18-05). The real app (Q23.4, merged November 19) numbers
  1, 1, 3 in `computeStandings` (TypeScript and the Go rule with its rule cases and wasm); it needs a ticket.

## Docs updated
- docs/business_logic/product/queue/modules/results/README.md, docs/mvp/decisions/README.md (D-2026-11-18-05),
  docs/screens/product/modules/queue/results-sharing.md
