# Saved player statistics: edge fade, and arrows only when the cards overflow

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players › Statistics carousel
Screen ID: Q-PLAYERS

## What changed
- Before: the Previous / Next arrows always showed, and a card cut off at the edge just ended abruptly.
- After: a gradient fade into the page background shows on each edge that still has cards beyond it (right
  at the start, left after scrolling, both in the middle). When all cards fit, as on wide screens, the
  arrows and the fades are removed. Scrolling, swiping and arrow keys are unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: show a gradient mask when there are items on the right;
  if none, remove the arrows and the mask.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Statistics carousel
