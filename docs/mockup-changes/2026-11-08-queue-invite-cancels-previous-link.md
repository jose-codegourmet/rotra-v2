# Invite cancels the previous registration link again

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Invite sheet
Screen ID: Q-SAVED-PLAYERS

## What changed
- Invite hint for unclaimed profiles: "Works once and lasts 7 days; opening Invite again makes another
  link without cancelling this one." → "Works once and lasts 7 days. Opening Invite again makes a new
  link and cancels this one."

## Why
- Owner, November 8, 2026: after #484 every second invite failed with "Something went wrong" because
  the database allows one active link per player. The owner chose the code-only fix (reissue revokes)
  over a migration.

## Docs updated
- Business logic: business open-decisions.md (L5), queue/modules/players/README.md
- Database design: none needed (the constraint already says one active link per player)
- Screen docs: queue/players-roster.md (Invite dialog), player-information/access-registration.md

## Real app work
- `issueClaimLink` revokes the player's active link before creating the new one.
