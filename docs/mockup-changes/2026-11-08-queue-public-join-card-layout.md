# Public page "Want to play?" card gets a stacked layout

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Want to play? card
Screen ID: public session page

## What changed
- Before: a heading and a sentence on the left with a small “Request to join” button squeezed beside them.
- After: title on the left and the slot status on the right (large accent number, “of 24 slots open”; “All
  slots taken” in the warning color; “Additional players can be admitted” during play), then the Skill mix
  bar (moved here from above the participants grid, replacing a slots-taken bar added in the first pass),
  one muted explanation line, and a full-width “Request to join” button (44 px tall).
- The text is the same facts as before; the Skill mix bar now sits in this card. No new rules.

## Why
- Owner comment on the artifact, November 8, 2026: change this layout to look good.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — Want to play? card
