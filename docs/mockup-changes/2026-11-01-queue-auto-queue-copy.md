# Explain Auto Queue choices, Catch Up targets and results

Status: IN MOCK APP — #322 (PR #334)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Queue › Auto Queue
Screen ID: Q-AUTO

## What changed
- Plain-language descriptions for all five tabs and the distinction between suggestions and Main Queue matches.
- “Games each player should reach” explains played plus planned games, earlier batch drafts, a worked example, and the separate session minimum. Placeholder only; no target is preselected.
- Count-aware action labels; visible and accessible disabled-action explanations; replacement/removal actions explain what happens to selected drafts.
- Normal full-batch status, short-batch and Catch Up results, contextual empty states, and a clear changed-Main-Queue notice. Removing unselected drafts clears the old result message, matching the app.
- Catch Up completion says “Everyone available” because in-play players are not eligible in this strategy. Plan Ahead short batches refer to “present” players.

## Why
- Jose reported that Auto Queue copy and the Catch Up target were unclear (#322).
- Wording follows the existing G3/G4 decisions. Generation, counting and selection behavior are unchanged.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/queueing/README.md — action names only; no rule change.
- Database design: none needed; copy only, no storage or command changes.
- Screen docs: docs/screens/product/modules/queue/match-queue.md — exact copy, target, disabled, empty and result states.
- Vocabulary: docs/product-terms.md — Catch Up counting and distinction from minimum.
- States: docs/screens/product/state-matrix.md — clear empty, full, shortfall and stale messages.

## Real app work
- Implemented under existing issue #322: AutoQueueWorkspace copy and accessible hints, current minimum/eligibility wiring, generation result strings, fixture-backed stories and updated stop-reason tests.
- Built under #322 (PR #334).
