# Session page: Request a match (player side)

Status: TICKETED — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › My night › Request a match sheet
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-JOIN (My night › Request a match)
Artifact: none
Components: sheet, segmented-control, player-tile, player-picker-sheet, team-lineup, button
Supersedes: none
Superseded by: none

## What changed
- New sheet **Request a match** for a present, signed-in, confirmed player: “Pick who you want to play with, or leave a spot as Anyone. The QM decides.”; **Format** segmented control only when the session has both formats; spots Partner, Opponent 1, Opponent 2 (singles: Opponent), each “Anyone” until picked, with a clear (×) back to Anyone; a spot opens a picker of present players as player tiles, fewest games first, already-picked tiles disabled (“Already picked”), with **Anyone** / **Back**. Footer **Cancel** / **Send request**.
- After sending, My night shows “Match request sent · the QM decides” with **Cancel**. The request is stored as `s.matchRequests[] = { id, pid, format, partner, opponents, at, status: 'open' }` for the QM side; one open request per player; I'm leaving and finishing the session close it.

## Why
- D-2026-11-09-05 (owner discussion, November 9, 2026). Presence shows only inside the picker and only to signed-in confirmed players.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: doubles and singles spots; all Anyone; partly picked; picker with a disabled tile; no other present players; request sent (Cancel).
- Copy: “Request a match”; “Pick who you want to play with, or leave a spot as Anyone. The QM decides.”; “Format”; “Partner · Anyone”, “Opponent 1 · Anyone”, “Opponent 2 · Anyone”, “Opponent · Anyone”; “Choose partner” / “Choose opponent 1”; “Present players only. Players on a court or already in a waiting match can still be picked.”; “Already picked”; “Anyone”; “Back”; “Cancel”; “Send request”; toast “Match request sent”; “Match request sent · the QM decides”; toast “Match request cancelled”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `sheet/`, `segmented-control/`, `player-tile/`, `button/`
- Extends: `player-picker-sheet/` (present-only list, Anyone action); `team-lineup/` (slot rows with an “Anyone” empty state)
- New: none
- Shares work with: 2026-11-09-queue-player-my-night; the QM side (Requests · N with Join | Match tabs) is a separate log

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/matches/README.md — Match request, player side
- Database design: docs/database_design/product/queue/modules/matches-queue.md — `match_requests`
- Screen docs: docs/screens/product/modules/queue/public-session.md — Request a match sheet

## Real app work
- `match_requests` write with the roster-link check and one-open-per-player; auto-close rules; the sheet and My night states in `apps/queue`.
