# Queue app: a queued match that can go on a court now stands out

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `queueCard()` (`.qtile.ready`, `.qt-ready`)
Route: /queue/sessions/s-tonight?tab=queue (and the Courts tab's upcoming row)
Screen ID: Q-QUEUE, Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: queue match card (ready state), pill label (new, small)
Supersedes: none
Superseded by: none

## What changed
- Before: a ready card only had a slightly green border, the “Ready to start” line and a primary Put on court.
- After, following the brand rules (accent `#00FF88`, `shadow-accent` glow, never colour alone):
  - the full accent border and a light accent tint (`--accent-subtle`) on the card;
  - the accent glow (`0 0 16px` accent at 25%);
  - a solid accent pill on the card's top edge: “✓ READY FOR COURT”.
- Cards that can't go on yet (waiting for a court, a player playing or not here) stay plain. The slide row has more top
  and bottom room so the pill and glow aren't cut off.

## Why
- Owner artifact comment, November 19, 2026, on a Main Queue card: when a card is available, change its background or
  show that it can be put on court, following ROTRA's design (glows, background changes, labels), picking what makes sense.

## Like for like
- Compare at: 375 px and 1280 px, dark and light: a ready card next to waiting ones, in slide and grid mode, and on the
  Courts tab's upcoming row; a ready card that is also a search hit.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (card)
