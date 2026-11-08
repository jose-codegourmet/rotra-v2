# Partial payment cards show the paid switch in yellow

Status: IN MOCK APP — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Payments (session preparation, live settings and the session record)
Screen ID: Q-PREPARE (Payments tab), session record Financials
Route: Statistics carousel (/queue/saved-players)
Components: switch, payments-checklist, saved-player-stats-carousel

## What changed
- Before: a player card with a partial payment already had a warning border and a yellow “Partial” chip,
  but its paid switch was the green accent like a fully paid card.
- After: the switch on a Partial card is warning yellow when on. Paid and Reimburse cards keep the accent
  switch.

## Why
- Owner comment on the artifact, November 8, 2026: if partial, show the switch as yellow too.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/financials-inventory.md — player cards line

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `switch/` (tone), `payments-checklist/`, `saved-player-stats-carousel/`; no new components
- Shares work with: `2026-11-08-queue-saved-players-stats-fade`

## Tickets
- Epic: #498 (Q13)
- #508 Q13.5 · Partial payment switch in yellow; saved player statistics edge fade
