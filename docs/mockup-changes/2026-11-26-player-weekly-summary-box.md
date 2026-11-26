# Player app: Weekly Performance summary in one box

Status: TICKETED — #1142
Date: 2026-11-26
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `weeklyPerf` (`.wp-sum`, `.wp-cells`, `.wp-split`) and styles
Route: profile, Home (Your stats), Games page
Screen ID: P-PROFILE, P-HOME, P-HISTORY (Weekly Performance card)
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: weekly performance summary
Supersedes: none
Superseded by: none

## What changed
- Before: four separate grey tiles (Games, Record, Win rate, Best day).
- After: one box holding all four, split by thin dividers (4 across on wide screens, 2 × 2 on phones), with larger
  figures (24 px, 20 px on phones), a soft gradient, Best day tinted in the accent with a trophy icon (short day name
  on phones), and a won/lost split bar along the bottom edge sized by wins and losses.
- The chart, legend and filters are unchanged.

## Why
- Owner artifact comment, November 26, 2026, on the summary tiles: "put this in one box and update the layout a bit,
  it looks so bland".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile, another player's profile, Home, Games page with a bar filter on.

## Copy
- Unchanged.

## Docs updated
- screens/product/modules/player-information/ranking-history.md (Weekly performance).
