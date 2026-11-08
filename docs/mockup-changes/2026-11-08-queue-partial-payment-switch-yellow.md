# Partial payment cards show the paid switch in yellow

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Payments (session preparation, live settings and the session record)
Screen ID: Q-PREPARE (Payments tab), session record Financials

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
