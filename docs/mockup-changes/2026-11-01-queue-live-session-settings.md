# Live sessions can reopen their preparation settings

Status: IN MOCK APP — #323 (PR #347)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console / Session settings
Screen ID: Q-CONSOLE, Q-PREPARE

## What changed
- Session settings in the live header opens the preparation route as a read-only summary.
- Locked formats, mode, minimum and levels explain Fixed after start; court booking windows and saved costs remain visible.
- Existing courts/time, Add player, Join requests and Payments controls remain available. Start and edit preparation stay pre-start only.

## Why
- Jose chose option 1 in issue #323's working chat on November 1, 2026.

## Docs updated
- Business logic: sessions/README.md and open-decisions.md — record read-only access; live editing remains undecided.
- Database design: none needed; this changes navigation/presentation only.
- Screen docs: session-setup.md, session-console.md and state-matrix.md — live summary and status guards.

## Real app work
- Implemented under existing ticket #323: SessionPreparation and SessionConsole wire existing sheets, SessionSetupCard displays fixed values and booking windows, RosterPanel/RosterRow support a read-only summary with locked levels.
