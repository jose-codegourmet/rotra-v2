# Queue app: Match History stacks the courts; each court's matches run newest-first from the top, time on top

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveHistoryPane()`, `lhTimeline()` (stacked courts)
Route: /queue/sessions/s-tonight?tab=history
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: match court card (reuse), a time column (new, small)
Supersedes: none
Superseded by: none

## What changed
- Before: a grid of match cards, newest first.
- After: the courts are stacked, one section under another (“Court 1 · 5 matches”). In each, the finished matches form
  one column, the latest on top (with a **Latest** chip) and earlier ones below. Each match
  has its start time and length on top (“9:07 AM · 16 min”) over an accent rule, then the match card. A two-court match
  shows under both courts. The court filter shows one section.
- Steps the same day: a calendar-style timeline first, then stacked courts with the time on the left, then newest on the
  left, then this (owner: “the history should be latest top, previous below”).

## Why
- Owner artifact comments, November 19, 2026, on Match History: “would be cool if the left side is the hours and intervals
  are in 10 minutes”, then “wait this is confusing, maybe just stack the courts”, then “maybe the cards move to the left most (left
  most is latest), time stamps should be on the top”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; all courts and one court; a court with no matches; a two-court match.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Match History)
