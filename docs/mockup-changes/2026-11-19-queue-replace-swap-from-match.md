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
- **Swap from match:** the opponents of the player coming out, in this same match (for Nina: Theo and Sam), each marked
  “Team B · opponent”. Before someone is chosen to come out it reads “Choose who's coming out to see who they can swap
  with.”
- Picking an opponent changes the primary button to **Swap players** and shows “Nina and Theo swap places: each joins the
  other's partner.” Confirming swaps the two in this match; nobody new comes in. Toast “Match 18: Nina and Theo swapped
  places”. The match is protected from regeneration.
- Picking from Suggestion or All players is a plain replace, as before.
- First version, the same day: the row took players from other queued matches. The owner's follow-up comment (“swap from
  match means swapping from either Dani and Sam's opponents”) changed it to this match's opponents.

## Why
- Owner artifact comments, November 19, 2026, on Replace a player: “add a 2nd row: Who's coming out? / Swap from match /
  Suggestion”, then “swap from match means swapping from either Dani and Sam's opponents”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; Getting ready and Playing; no one chosen to come out; singles (one opponent).

## Open
- Whether Substitute (mid-game) should get Swap from match too. The mockup adds it to Replace only.

## Docs updated
- docs/screens/product/modules/queue/match-control.md (change-a-player pickers)
