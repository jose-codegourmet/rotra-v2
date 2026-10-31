# Saved player statistics carousel

Status: ALREADY A TICKET — #301
Date: 2026-10-31
App: queue
Mockup: app/mocksups-app/queue-app/rotra-queue.html › Saved players
Screen ID: Q-SAVED-PLAYERS

## What changed
- Added six statistic cards between the page header and filters, with horizontal swipe, arrow controls and keyboard navigation.
- Cards count all saved club players, registered players, the three level bands and additions this week. Search and filters never change these totals.
- This week starts Monday at 00:00 in Asia/Manila and ends at the current instant. Missing and future added dates do not count.

## Why
- Issue #301 requests these cards; the owner confirmed the week boundary on October 31, 2026.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — saved-player statistics and week boundary.
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — added_at also supplies the weekly derived count; no new table or migration.
- Screen docs: docs/screens/product/modules/queue/players-roster.md — card order, interactions and states.

## Real app work
- Already scoped by #301: Embla carousel in @rotra/ui, stories in both themes, data derivation and tests in @rotra/data, and wiring on /saved-players.
