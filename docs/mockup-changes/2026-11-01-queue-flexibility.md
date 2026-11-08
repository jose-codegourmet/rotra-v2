# Queue flexibility review prototype

Status: IN MOCK APP — #283 (PR #312)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › preparation, Courts, Players, Queue
Screen ID: Q-SETUP, Q-ADD-PLAYER, Q-POOL, Q-COURTS, Q-ADD-COURT, Q-QUEUE, Q-AUTO

## What changed
- Active sessions can admit additional players above the slot budget.
- Courts have individual planned windows; Auto Queue drafts are reviewed before transfer.

## Why
- Owner-approved Queue flexibility decisions in issue #283.

## Docs updated
- Business logic: Queue players, sessions and queueing.
- Database design: sessions-roster and matches-queue handoff notes; no schema changes.
- Screen docs: Queue setup, players, console, queue, dispatch, states and dialogs.

## Real app work
- Dependent mock components, data, screens and states are covered by issues #284–#298.
