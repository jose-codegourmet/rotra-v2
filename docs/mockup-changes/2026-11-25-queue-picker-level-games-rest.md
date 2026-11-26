# Replace and Substitute pickers: level ring, games badge, rest colours

Status: TICKETED — #1127
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › swapPicker() tile (`.ptile.sm`, `.sp-face`, `.sp-rest`)
Route: /queue/sessions/<live session> › Open match › Replace player (or tap a player › Replace / Substitute)
Screen ID: Q-MATCH / Q-ON-COURT › Replace and Substitute pickers (match-control.md)
Artifact: none
Components: the picker's player tile (Who's coming out, Swap from match, Suggestion, All players)
Supersedes: none
Superseded by: none

## What changed
- Before: each tile showed a plain picture, the name and "0/5 · rest 182m" in grey.
- After: the picture has the level ring (Beginner, Intermediate, Advanced; none keeps the plain
  edge) and the games badge on its corner, like the Main Queue faces. A free player's "rest Nm"
  takes the wait colours: plain under 10 min, warning from 10, error from 16. Busy and away players
  keep their grey "Playing", "On court" or "Away".
- The line under the name drops "0/5 ·" (the games badge already shows the count): it reads
  "rest 226m", "Playing", "On court", "Away" or the tile's note ("Team A · opponent").

## Why
- Owner, November 25, 2026, on the Replace player dialog: "should show skill border and games
  count; longer the rest it should be red; please apply the urgency color on the resting times";
  then "since we already see the game count in the border, please remove the 0/5".

## Like for like
- Compare at: 375 px (stacked All players) and 1280 px (All players panel), dark and light.
- States: each level and no level; rest under 10, 10–15, 16+; busy, away; a picked tile.
- Copy: "rest Nm" (was "N/M · rest Nm"); the accessible name keeps "N of M games" and adds the level.
- Tokens: none (`--lv-beg`, `--lv-int`, `--lv-adv`, `--warn`, `--error`).
- Known differences: none.

## Reuse plan
- Extends: the picker tile in the Replace / Substitute sheets. Reuse the level ring and games badge
  from PlayerFaceButton and the wait tone thresholds from StatusPill (10 / 16 min).

## Docs updated
- Business logic: none. Database design: none.
- Screen docs: docs/screens/product/modules/queue/match-control.md (pickers).

## Real app work
- Picker tile: level ring, games badge, rest text in the wait tone.
