# Queue app: Match History stacks the courts, with each match's start time on the left

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
- After: the courts are stacked, one section under another (“Court 1 · 5 matches”). In each, the finished matches run in
  play order. Each row has the start time (“7:50”) and the length (“14 min”) on the left, by an accent rule, then the
  match card. Wide screens put two rows side by side. A two-court match shows under both courts. The court filter shows
  one section.
- First version, the same day: a calendar-style timeline (10-minute lines down the left, one column per court). The owner
  found it confusing (“maybe just stack the courts”), so it was replaced.

## Why
- Owner artifact comments, November 19, 2026, on Match History: “would be cool if the left side is the hours and intervals
  are in 10 minutes”, then “wait this is confusing, maybe just stack the courts”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; all courts and one court; a court with no matches; a two-court match.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Match History)
