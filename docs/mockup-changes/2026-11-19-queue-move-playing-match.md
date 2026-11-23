# Queue app: a playing match can move to a free court

Status: TICKETED — #1042
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtMenu()`, sheet `match` (Q-ACTIVE-MATCH), sheet `moveCourt`, `confirmMove`
Route: /queue/sessions/s-tonight (Courts tab)
Screen ID: Q-CONSOLE, Q-ACTIVE-MATCH
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court menu item, a button in the match sheet, the Move match sheet (reuse)
Supersedes: none
Superseded by: none

## What changed
- Before: only a Getting ready match could move to another court.
- After: a Playing match can too: **Move to a free court** in the Playing court card's ⋯ menu and as a button in the Open
  match dialog (disabled with “No court is free” when none is free; a two-court match needs two).
- The Move match sheet reads “Now on Court 3. It keeps playing on the new court; its time doesn't restart.” Confirming
  moves it, keeps it playing with the same start time, frees the old court (Auto Queue fills it), returns to the match
  dialog, and toasts “Match 17 moved from Court 3 to Court 4 · still playing”.

## Why
- Owner artifact comment, November 19, 2026, on a playing court: “playing courts can transfer to vacant court”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; from the menu and from the dialog; no free court; a two-court match;
  Auto Queue on.

## Docs updated
- docs/business_logic/product/queue/modules/matches/README.md
- docs/screens/product/modules/queue/match-control.md (Q-ACTIVE-MATCH)
