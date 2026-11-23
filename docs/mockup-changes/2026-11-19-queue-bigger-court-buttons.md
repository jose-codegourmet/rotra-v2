# Queue app: bigger court buttons in Put on court and Move match

Status: IN MOCK APP — #1044
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheets `dispatch` and `moveCourt` (`.court-pick`)
Route: /queue/sessions/s-tonight (Put on court, Move match)
Screen ID: Q-DISPATCH, Q-ON-COURT, Q-ACTIVE-MATCH
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court pick tile (new)
Supersedes: none
Superseded by: none

## What changed
- Before: small toggle buttons with the court name.
- After: a grid of large tiles, at least 140 px wide and 76 px tall: the court name in bold, “Free now” under it, and a
  round check in the corner that fills when the court is picked. The picked tile gets the accent border and tint. Two-court
  matches still pick two.

## Why
- Owner artifact comment, November 19, 2026, on the court picker: “make the court buttons here a bit big”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; one and several free courts; a two-court match picking two.

## Docs updated
- docs/screens/product/modules/queue/match-control.md (Q-DISPATCH)
