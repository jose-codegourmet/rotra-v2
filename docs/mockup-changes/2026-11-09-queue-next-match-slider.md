# Next-match picker: a slider of up to five ready matches, #1 first

Status: IN PROGRESS — #586
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live session › Match done › Confirm › Next on Court N
Route: /queue/sessions/<live session id> (after Confirm Team X wins)
Screen ID: Q-NEXT-MATCH
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: next-match-sheet, sheet, avatar, chip, button
Supersedes: 2026-11-09-queue-next-match-picker (the two-card left/right pair and swipe-to-pick only)
Superseded by: none

## What changed
- The two-card pair is replaced by a horizontal **slider**: one eligible match per card, full width, **#1 first on the left**, at most **five** cards (the first five ready matches in Main Queue order; same readiness check as before).
- Each card: “#P”, the format chip, **Next in line** on the first card, “K of N”; Team A's pictures with first names, “VS”, Team B's; each picture carries the game-count badge (`.pf-face` + `.pf-g`); full-width **Pick this**.
- **‹ / ›** arrow buttons (more than one card) scroll one card. Mouse or pen drag scrolls the slider and snaps to the nearest card on release; touch scrolls natively with scroll snap.
- A right-edge gradient mask shows while more cards are to the right; it is removed at the last card and when there is only one card (the `pqSync` observer now also watches `[data-nm-slider]`).
- Swiping no longer picks; each card has its own **Pick this**. The Left / Right labels and the swipe hint are gone; the note reads “Only matches that can go on right now. The number on each face is that player's games so far.” plus “Drag, swipe or use the arrows to see the next one. Up to 5 are shown.”

## Why
- Owner comments on the published artifact, November 9, 2026: “make this into a slider, left is number 1, only show the eligible ones, one card at a time, show avatars with game counts” and “draggable slide, mask the right side if more items to show and remove mask if none, should limit to 5 matches only”.

## Like for like
- Compare at: 375 px (fullscreen sheet) and 1280 px, dark and light.
- States: one candidate (no arrows, no mask), two to five (arrows, mask until the last card), none (notice, Close only), the error notice after a stale pick; drag with a mouse, swipe on touch, arrows, reduced motion (no smooth scroll).
- Copy: as quoted under What changed.
- Tokens: none new; new classes `.nm-slider-wrap`, `.nm-slider`, `.nm-arrow`.
- Known differences: the old swipe-to-pick handler is still in the prototype script but has nothing to act on (as in the artifact).

## Reuse plan
- Reuses as is: `avatar/`, `chip/`, `button/`, `sheet/`
- Extends: `next-match-sheet/` (slider, arrows, mask, game badges, five candidates)
- New: none (a generic horizontal slider could be shared later)
- Shares work with: 2026-11-09-queue-next-match-fullscreen

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/queueing/README.md — Next-match picker (five candidates, slider); docs/business_logic/product/queue/modules/matches/README.md — completion sentence
- Database design: none
- Screen docs: docs/screens/product/modules/queue/match-control.md — Q-NEXT-MATCH
- Terms: none

## Real app work
- Replace the pair and swipe with the slider; raise the candidate limit to five; badges with games played; arrows, drag-to-scroll with snap, right-edge mask.
