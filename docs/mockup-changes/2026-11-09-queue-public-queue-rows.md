# Session page: the Queue pins #1 and scrolls the rest as one-row matches

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Details › Queue; Prototype › Demo scenarios › Full house
Route: /queue/s/<Full house session id> (View as: Confirmed · in queue)
Screen ID: Q-PUBLIC-DETAILS (Queue)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public-session-queue, match-card, chip, avatar
Supersedes: none
Superseded by: none

## What changed
- The signed-in Player's read-only **Queue** pins **#1** on its own above the list: yellow border and glow (`--warn`) and a **Next** chip.
- **#2 onward** sit in a vertical scroll box (max about 380 px). Its bottom edge fades out with a gradient mask until the box is scrolled to the end; the fade is gone when the list fits without scrolling.
- Each queued match is **one row**: position (#N), Team A's pictures and first names, **VS**, Team B's. No format chip (the faces tell the format) and no “Waiting in queue” line. At 640 px and narrower the position sits on the left and the two teams and VS stack beside it.
- Names: first word only, masked per the existing public name rules (“Y***” for a masked guest).
- Demo data: the **Full house** scenario's waiting queue is now ten matches of mixed sizes, in order: 3 v 3, 5 v 5, 1 v 2, 4 v 4, 2 v 2, 1 v 1, 1 v 2, 3 v 3, 2 v 2, 4 v 4. Prototypes saved in the browser before this change get the mixed queue once (marker `mixedQ: 2`). Prototype data only; no product rule.

## Why
- Owner request on the published artifact, November 9, 2026: the public queue should highlight the next match, show the rest as a compact scrolling list, and let the faces tell the format instead of a label. (The owner's comment text was not available when this log was written; to be pasted in.)

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: one queued match (no scroll box); two to three (no fade); ten (fade, then none at the end); empty (“No matches queued yet.”); a mix of 1 v 1 up to 5 v 5 rows.
- Copy: “Read-only · Last synced queue”, “Next”, “VS”.
- Tokens: none new (`--warn`, `--warn-subtle`, existing `.qtile` styles); new classes `.pq-first`, `.pq-row`, `.pq-scroll`, `.pq-grid`, `.qtile.pq.next`.
- Known differences: the scroll fade is driven by a scroll listener in the prototype; the real app may use any equivalent.

## Reuse plan
- Reuses as is: `chip/`, `avatar/`
- Extends: `public-session-queue/` (pinned first, scroll box, one-row layout), `match-card/` (compact row variant without format or status)
- New: none
- Shares work with: 2026-11-09-queue-public-court-cards, 2026-11-09-queue-public-signed-in-names-join

## Docs updated
- Business logic: none (presentation only)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/public-session.md — Details tab, signed in, live session; Signed-in Player access (layout note)
- Terms: none

## Real app work
- Rebuild the public Queue section: pinned #1 with Next, scrolling rest with the end fade, one-row matches without a format label.
- Mock data: give the Full house fixture a mixed-size waiting queue in the order above.
