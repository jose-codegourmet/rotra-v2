# Queued matches: a red Clear queue button removes every waiting match

Status: IN MOCK APP — #586
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live session › Queue pane › Queued matches header; Clear the queue? sheet
Route: /queue/sessions/<live session id>?tab=queue
Screen ID: Q-QUEUE (Queued matches header), D-CLEAR-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: button, confirm-sheet, match-queue-panel
Supersedes: none
Superseded by: none

## What changed
- The Queued matches header gets a solid red **Clear queue** button after **Regenerate** (`btn sm danger fill`; new `.btn.danger.fill` style: `--error` background, white text, slightly darker on hover). Disabled when no match is waiting.
- It opens a confirm sheet **Clear the queue?**: “N waiting matches will be removed from the Main Queue.” and, muted, “Matches already on a court and finished matches are not affected. You can add or generate matches again afterwards.” Footer **Keep queue** / red **Clear queue**.
- Confirming removes every waiting match (manual and automatic), clears the selection, records no game, and toasts “Queue cleared · N waiting matches removed”. On court, Playing and finished matches stay.

## Why
- Owner comment on the published artifact, November 9, 2026: “please add a button called clear queue but make it red”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: enabled with waiting matches, disabled with none, the confirm sheet (1 match / N matches wording), after clearing (Queue 0 waiting, courts unchanged).
- Copy: as quoted under What changed.
- Tokens: none new (`--error`); new modifier `.btn.danger.fill`.
- Known differences: the fill text color is `#fff` in the prototype, as in the artifact; the real app should use a token (for example an on-error token) if one exists.

## Reuse plan
- Reuses as is: `confirm-sheet/`
- Extends: `button/` (solid danger variant), `match-queue-panel/` (Clear queue in the header)
- New: none
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/queueing/README.md — Main Queue (Clear queue)
- Database design: none (waiting matches are removed exactly as Remove does, in bulk)
- Screen docs: docs/screens/product/modules/queue/match-queue.md — header; docs/screens/product/dialogs.md — D-CLEAR-QUEUE
- Terms: none

## Real app work
- Solid danger button variant; Clear queue in the queue header with the D-CLEAR-QUEUE confirmation; a bulk remove of waiting matches (no games recorded).
