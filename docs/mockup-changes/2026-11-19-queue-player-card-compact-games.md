# Queue app: the live player card's game counts become one compact strip, Current | Total

Status: TICKETED — #1048
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console › Players card (`playersPane()`, CSS `.pc3-games`)
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-POOL
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player card
Supersedes: the two number boxes from 2026-11-09-queue-player-cards-games
Superseded by: none

## What changed
- Before: two boxes side by side, a big number over “played” and a big number over “for the night”.
- After: one slim strip, the two numbers split by a hairline: **3 · Current** and **6 · Total** (Total in the
  accent colour). Numbers 18 px, labels small caps. Hovering a number explains it (“Games played so far”,
  “Played plus queued for the night”). The values are unchanged.

## Why
- Owner artifact comment, November 19, 2026: “to be more compact, say 3 | 6, current | Total, or use icons”.
  The mockup uses words, not icons.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: player with no games, with queued games, playing, away.

## Copy
- “Current”, “Total”.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Player card)
