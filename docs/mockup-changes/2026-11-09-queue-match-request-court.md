# Request a match: the request is laid out on a court

Status: IN PROGRESS — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › My night › Request a match sheet
Route: /queue/s/s-tonight (View as: present) › Request a match
Screen ID: Q-PUBLIC-DETAILS (My night › Request a match)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court-pitch, match-request-sheet
Supersedes: none
Superseded by: none

## What changed
- The Request a match sheet draws the console's court (same lines and green) instead of a plain list of spot rows. The viewer stands on the left side as a face with an accent **You** pill; the **Partner** spot sits under them. The **Opponent 1** and **Opponent 2** spots are on the right side (singles: You on the left, **Opponent** on the right).
- An empty spot is a dashed “+” face with its label; tapping it opens the same present-players picker. A picked spot shows the player's picture and short name. Picked spots also list under the court with **Change** and × (back to Anyone).
- Intro copy: “Tap a spot to pick who you want to play with, or leave it as Anyone. The QM decides.”

## Why
- Owner comment on the published artifact, November 9, 2026: “this should show like the courts bg, where you put the player in the left corner and request partners and opponents (right side)”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: doubles with all spots Anyone; partner picked; all three picked; singles; picker open.
- Copy: “You”, “Partner”, “Opponent 1”, “Opponent 2”, “Opponent”, the intro line above.
- Tokens: `--accent`, `--on-accent`, court tokens via the existing court drawing; the white and black overlays are the court drawing's fixed values.
- Known differences: the partner spot sits under the viewer (same side) rather than in a corner; the rows under the court for picked spots are kept so a pick can be cleared. Owner to confirm.

## Reuse plan
- Reuses as is: `court-pitch/` (the console's court drawing), `avatar/`
- Extends: `match-request-sheet/` (court layout with spot buttons)
- New: none
- Shares work with: 2026-11-09-queue-player-match-request

## Docs updated
- Business logic: none needed (same request; layout only)
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — Request a match sheet

## Real app work
- `match-request-sheet` renders the court layout; spots reuse the console court faces.
