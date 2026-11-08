# Public page "Want to play?" card gets a stacked layout

Status: IN PROGRESS — #500
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Want to play? card
Screen ID: public session page
Route: /queue/s/s-tonight
Components: join-request-card

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

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `join-request-card/`; reuses `skill-distribution-bar/` from Q13.1 as is
- Shares work with: `2026-11-08-queue-public-participants-plain-grid`, `2026-11-08-queue-public-waitlist-tiles`

## Tickets
- Epic: #500 (Q15)
- #515 Q15.3 · Want to play? card: stacked layout with slots and the Skill mix bar
- #516 Q15.4 · Public page and operator preview use the new participants and Want to play? card
