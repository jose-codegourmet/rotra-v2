# Queue app: the Main Queue drops the Regenerate button

Status: TICKETED — #1069
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `queuePane()` header (Main Queue)
Route: /queue/sessions/s-tonight?tab=queue
Screen ID: Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: Main Queue header actions, attention notice
Supersedes: none
Superseded by: none

## What changed
- Before: the Main Queue header read Add match, Suggest, Generate Queue, **Regenerate** (primary when a match needs
  attention), Clear queue. The attention notice ended “… or regenerate.”
- After: **Regenerate** is gone. The header reads Add match, Suggest, Generate Queue, Clear queue. The notice reads
  “N waiting matches need attention. Edit the lineup to swap the player.”
- The Regenerate dialog code stays in the mockup but nothing opens it.

## Why
- Owner artifact comment, November 19, 2026, on the Regenerate button: “remove this”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: empty queue; queue with a match that needs attention.

## Copy
- Notice: “N waiting match(es) need(s) attention. Edit the lineup to swap the player.”

## Open
- The business rules for Regenerate (protected manual matches, needs-attention rebuilds) are marked as removed but kept.
  Delete them, or does Clear queue followed by Generate Queue cover the case?

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (header)
- docs/business_logic/product/queue/modules/queueing/README.md (Needs attention, Regenerate)
- docs/business_logic/product/queue/modules/queueing/flow/generate-and-dispatch.md (step 3)
