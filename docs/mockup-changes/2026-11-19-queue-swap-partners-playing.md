# Queue app: drag to swap partners also while a match is playing; tap a card to bring in someone from outside

Status: IN MOCK APP — #1042
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheets `match` (Q-ACTIVE-MATCH) and `onCourt` (Q-ON-COURT), `swapSides()`
Route: /queue/sessions/s-tonight (Courts tab › Open match)
Screen ID: Q-ACTIVE-MATCH, Q-ON-COURT
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: dialog player card (reuse), drag swap (reuse)
Supersedes: none
Superseded by: none

## What changed
- **Playing (Q-ACTIVE-MATCH):** players can now be dragged onto someone in the other pair to swap partners (before: only
  in Getting ready). Arrow keys on a focused card do the same. Toast “Match N: A and B swapped partners”. No
  substitution is recorded; the result follows the pairs at Match done.
- **Both dialogs:** tapping a card brings in a player from outside: Substitute or Replace while playing, Replace while
  getting ready. The picture opens the profile.
- Help lines: “Drag a player onto someone in the other pair to swap partners. Tap a player's card to bring in someone
  from outside (substitute or replace), or their picture to see their profile.” (Getting ready: “… to replace them with
  someone from outside …”).

## Why
- Owner artifact comment, November 19, 2026, on the match dialog: “you can either drag the players to a different pair to
  swap partners or tap/click to replace a player from outside”.
- This amends the November 6, 2026 lifecycle rule that partners can't be switched once a match is playing.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; drag and arrow-key swap while playing and getting ready; tap to
  substitute or replace.

## Open
- Whether a partner swap mid-game should be logged on the match (like substitution lines) for the record.

## Docs updated
- docs/business_logic/product/queue/modules/matches/README.md (Lifecycle)
- docs/screens/product/modules/queue/match-control.md (Q-ACTIVE-MATCH)
