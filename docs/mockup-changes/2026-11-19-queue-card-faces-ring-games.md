# Queue app: Main Queue card pictures show the level ring and games played

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `queueCard()` faces (`.qf`, `.pf-g`)
Route: /queue/sessions/s-tonight?tab=queue
Screen ID: Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: queue card face (reuse the level ring and the court card's games badge)
Supersedes: none
Superseded by: none

## What changed
- Each player's picture on a Main Queue card has a 3 px ring in the level band colour (Beginner, Intermediate, Advanced;
  grey with no level) and, on the ring's top right, a small badge with the player's games so far (the same badge as the
  court cards). The name and wait time stay under the picture. The screen-reader label adds the games.
- The compact cards on the Courts tab already have rings; they don't get the badge.

## Why
- Owner artifact comment, November 19, 2026, on the Main Queue cards: “put the skill borders and x games on the borders too”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; each band and no level; 0 and 10+ games.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (card)
