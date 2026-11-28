# Queue app: waiting matches that need attention lose the yellow border

Status: IN MOCK APP — #1062
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `.qtile.attn` (now drafts only)
Route: /queue/sessions/s-tonight?tab=queue (and the Courts tab's upcoming row)
Screen ID: Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: queue match card (attention state)
Supersedes: none
Superseded by: none

## What changed
- Before: a waiting match that needed attention (a player not here, a lineup that no longer works) had a yellow border.
- After: no yellow border. It keeps its warning status line (icon and text, e.g. “Migo is not present”) and the Main
  Queue header still counts “N need attention”. Only ready cards are highlighted (green).
- Generate Queue drafts keep their warning border.

## Why
- Owner artifact comments, November 19, 2026, on the Main Queue: “whats the difference with yellow and green border?”,
  then “please remove the yellow ones, green is enough”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light: a ready card, an attention card and a waiting card side by side.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (card states)
