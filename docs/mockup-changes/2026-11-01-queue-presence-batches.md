# Presence switches save in a background batch

Status: IN MOCK APP — #324 (PR #349)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Players and preparation roster
Screen ID: Q-POOL, Q-ROSTER

## What changed
- Immediate switches and counts; pending filtered cards stay in place until save settles or the filter changes.
- One 800 ms background batch, one Roster sync entry and one summary toast. Reversals produce no write.
- Flush before navigation and related operations; retain existing write guards and failure feedback.

## Why
- Jose's answers in #324 approve 800 ms, one summary toast and filter retention.

## Docs updated
- Business logic: queue/modules/players/README.md — approved batch behavior.
- Database design: none needed; mock batching only, no schema or persistence change.
- Screen docs: session-console.md, players-roster.md, state-matrix.md — optimistic state, summary copy and rollback.

## Real app work
- Existing ticket #324 implements shared DebouncedBatch/useDebouncedBatch, setPresenceMany/useSetPresenceMany and both presence surfaces. #300 can reuse the helper; payment switches are unchanged here.
