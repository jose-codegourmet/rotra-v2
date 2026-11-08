# Saved player statistics: edge fade, and arrows only when the cards overflow

Status: TICKETED — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players › Statistics carousel
Screen ID: Q-PLAYERS
Route: Statistics carousel (/queue/saved-players)
Components: switch, payments-checklist, saved-player-stats-carousel

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

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `switch/` (tone), `payments-checklist/`, `saved-player-stats-carousel/`; no new components
- Shares work with: `2026-11-08-queue-partial-payment-switch-yellow`

## Tickets
- Epic: #498 (Q13)
- #508 Q13.5 · Partial payment switch in yellow; saved player statistics edge fade
