# Queue app: Replace player has a second row, Swap from match

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `swapPicker()` (`swapRow`), sheet `replace`, actions `pickSwapIn`, `confirmReplace`
Route: /queue/sessions/s-tonight (Courts tab › Open match › a player's card)
Screen ID: Q-ACTIVE-MATCH, Q-ON-COURT
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player picker dialog (reuse tiles); a new section
Supersedes: none
Superseded by: none

## What changed
- The Replace a player dialog now has three rows: **Who's coming out?**, **Swap from match** (new), **Suggestion**
  (was “Suggested”; the Substitute picker uses the new name too).
- **Swap from match:** up to eight present players who aren't on a court, taken from queued matches in queue order, each
  tile marked “In #P · Match N”. A queued match that already has the player coming out can't swap (its tiles are
  disabled). Picking one changes the primary button to **Swap players** and shows “OUT takes IN's place in queued match N.”
- Confirming swaps them: the picked player comes into this match, and the player coming out takes their place in that
  queued match (marked protected from regeneration). Toast “Match 16: Carlo in for Rafa · Rafa moves to queued match 23”.
- Picking from Suggestion or All players is a plain replace, as before.

## Why
- Owner artifact comment, November 19, 2026, on Replace a player: “add a 2nd row: Who's coming out? / Swap from match /
  Suggestion”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; Getting ready and Playing; a disabled swap tile; no queued players.

## Open
- Whether Substitute (mid-game) should get Swap from match too. The mockup adds it to Replace only.

## Docs updated
- docs/screens/product/modules/queue/match-control.md (change-a-player pickers)
