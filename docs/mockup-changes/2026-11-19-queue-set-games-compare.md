# Queue app: Set games played shows Now and To side by side

Status: IN MOCK APP — #1047
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheet `setGames` (D-SET-GAMES), `.gcmp`
Route: /queue/sessions/s-tonight?tab=roster (Current on a Players card, or Set games for all…)
Screen ID: D-SET-GAMES
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: comparison box (new): two panels with an arrow between, the right one holding the stepper
Supersedes: none
Superseded by: none

## What changed
- Before: a “Games played now — N” row, then one stepper box.
- After: a comparison box. Left: **Now**, the current count, “games played” (for everyone: the roster's range, “games
  each”). An arrow. Right: **To**, the − N + stepper, and under it “+1 game”, “−2 games” or “No change yet” (“for every
  player” for everyone). The To panel turns accent once it differs from Now.
- Step 2 (the confirmation) is unchanged.

## Why
- Owner artifact comment, November 19, 2026, on Set games played: “should be a comparison box, left is now and then right
  is ‘to’”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; one player unchanged and changed; Set games for all.

## Docs updated
- docs/screens/product/dialogs.md (D-SET-GAMES)
