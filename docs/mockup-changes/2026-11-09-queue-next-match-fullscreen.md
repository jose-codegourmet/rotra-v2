# The next-match picker is fullscreen on phones

Status: IN MOCK APP — #579
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console › Match done › Confirm Team X wins › Next on Court N sheet
Route: /queue/sessions/s-tonight/preparation (live session, Courts section; finish a playing match with Match done, then Confirm)
Screen ID: Q-NEXT-MATCH
Artifact: none
Components: sheet, next-match-sheet
Supersedes: none
Superseded by: none

## What changed
- Before: on phones the “Next on Court N” picker was a bottom sheet covering about 60% of the screen.
- After: on phones (640 px and narrower, the bottom-sheet breakpoint) it fills the whole screen: top 0, full
  height, full width, no rounded corners, safe-area padding. Header (title, Close) at the top, **Skip for
  now** pinned to the bottom, body between them scrolls if needed. In the body: intro first, then the card
  pair grows to the free height (equal-height cards, team names 18 px bold, **Pick this** at the bottom of
  each card), swipe hint under the pair. One candidate: one full-width card. None: the notice at the top of
  the body. Slides up from the bottom as before; no slide under reduced motion.
- Wide screens keep the centered dialog unchanged.

## Why
- Owner request, November 9, 2026 (#579 follow-up): the bottom sheet was too small to read and tap
  comfortably mid-session.

## Like for like
- Compare at: 375 px (fullscreen) and 1280 px (unchanged), dark and light, beside the mockup route above.
- States: two candidates; one candidate; none; error notice; long names wrapping.
- Copy: unchanged.
- Tokens: none (existing tokens only).
- Known differences: none

## Reuse plan
- Reuses as is: `sheet/` (new optional `fullscreen` prop), `next-match-sheet/`
- New: none
- Shares work with: none

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/match-control.md (Q-NEXT-MATCH)
- Decision register: none

## Real app work
- Same follow-up PR as #579: `fullscreen` prop on `Sheet` in `@rotra/ui`, used by `NextMatchSheet`.
