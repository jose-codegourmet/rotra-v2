# Queue app: Match History is a timeline with times down the left in 10-minute steps

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveHistoryPane()`, `lhTimeline()`
Route: /queue/sessions/s-tonight?tab=history
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: match court card (reuse), a timeline grid (new)
Supersedes: none
Superseded by: none

## What changed
- Before: Match History was a grid of match cards, newest first.
- After: a timeline. The left side shows the time every 10 minutes (hours in bold, like “8 AM”; minutes like “8:10”), with
  a solid line on each hour and a dashed line every 10 minutes. One column per court, its name on a sticky header.
- Each finished match sits at its start time in its court's column, with an accent edge as tall as the match lasted (10
  minutes = 100 px). A two-court match shows in both columns. The court filter shows one column.
- Wide timelines scroll sideways (columns are at least 240 px).

## Why
- Owner artifact comment, November 19, 2026, on Match History: “would be cool if the left side is the hours and intervals
  are in 10 minutes”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; all courts and one court; a short match (card taller than its time); a
  two-court match.

## Open
- The match cards are taller than a short match's slot (under about 13 minutes), so they can overlap the next one.
  A compact card for the timeline would fix that.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Match History)
