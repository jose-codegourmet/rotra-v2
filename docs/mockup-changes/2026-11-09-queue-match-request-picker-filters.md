# Request a match: the partner / opponent picker gets tabs, a skill filter and a sort

Status: IN MOCK APP — #585 (PR #666)
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Request a match › Choose partner / opponent
Route: /queue/s/<Full house session id> (View as: Confirmed · in queue) › Request a match › a spot
Screen ID: Q-PUBLIC-DETAILS (My night › Request a match)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player-picker-sheet, tabs, segmented-control, player-tile
Supersedes: none
Superseded by: none

## What changed
- The **Choose partner / opponent** picker gets tabs **All · N**, **Playing · N** (present players on a court) and **Available · N** (present players not on a court), counted over present players other than the viewer.
- A skill filter pill row: **All levels / Beginner / Intermediate / Advanced** (by the player's skill group).
- A sort pill row: **↓ Longest wait**, **↑ Shortest wait**, **↑ Fewest games** (default), **↓ Most games**; each pill has a tooltip and accessible name (“Waiting time, longest first”, and so on).
- The choices stay while the sheet is open and reset with a new request. Tiles, Already picked, **Anyone** and **Back** are unchanged.

## Why
- Owner request on the published artifact, November 9, 2026: players choosing a partner or opponent need to see who is playing or free, filter by level and sort by waiting time or games. (The owner's comment text was not available when this log was written; to be pasted in.)

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each tab, each skill filter (including an empty result: “No other present players.”), each sort.
- Copy: as quoted under What changed.
- Tokens: none new (`.tabs`, `.seg`).
- Known differences: none.

## Reuse plan
- Reuses as is: `tabs/`, `segmented-control/`, `player-tile/`
- Extends: `player-picker-sheet/` (match request variant with show / skill / sort controls)
- New: none
- Shares work with: 2026-11-09-queue-match-request-formats, 2026-11-09-queue-match-request-court

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/matches/README.md — Match request, player side (Playing / Available shown in the picker)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/public-session.md — Request a match sheet
- Terms: none

## Real app work
- Add the show tabs, skill filter and sort to the match-request picker; Playing comes from the on-court matches, waiting time from the existing rest info.
