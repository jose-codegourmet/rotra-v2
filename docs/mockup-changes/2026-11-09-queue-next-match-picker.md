# After a result, a next-match picker offers two ready matches (left or right)

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
- Before: Confirm result freed the court, and with Auto Queue on the court was refilled automatically; with
  Manual Queue the operator had to open the court and choose a match.
- After: Confirm result still marks the match done and (with Auto Queue on) fills every other free court,
  but the freed court opens a “Next on Court N” sheet. It offers the first two waiting matches in Main
  Queue order that are ready for that court, as two equal cards side by side (Left, Right), each with
  **Pick this**. Picking places the match On court (getting ready, not started). **Skip for now** (also
  Close, Escape, backdrop) places nothing; Auto Queue then fills that court as before, Manual Queue leaves it
  free.
- On touch screens the card pair can be swiped: left picks the left card, right picks the right card
  (drag at least 96 px or 30 % of the width, horizontal clearly dominant; otherwise it snaps back).
- Zero ready matches: the sheet says “No ready match for Court N right now.” with only **Close**. One
  ready match: only that card, full width, no swipe.

## Why
- Owner decisions, November 9, 2026 (#579): left and right are two equal options; candidates are the first
  two ready waiting matches in Main Queue order (the existing readiness check, no new ranking); the picker
  opens after every confirmed result in both Manual Queue and Auto Queue.

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States: two candidates; one candidate; none; “That match is not ready any more. Pick again.” error;
  swipe leaning left and right (touch); long names wrapping; Auto Queue on and off.
- Copy: “Next on {Court}”; “Match {N} is done. Pick the match that goes on next. It goes on court getting
  ready; you start it from the court.”; “Left”; “Right”; “Pick this” (aria-label “Put match #P on {Court}:
  {Team A} vs {Team B}”); “Swipe left or right to pick, or tap Pick this.” (coarse pointers, two candidates
  only); “Skip for now”; “No ready match for {Court} right now.”; “Close”; “That match is not ready any more.
  Pick again.”; toast “Match {N} on {Court} · getting ready”.
- Tokens: none (existing tokens only).
- Known differences: none

## Reuse plan
- Reuses as is: `sheet/` (shell), `button/`, `chip/`, `notice` pattern from the other Queue sheets
- New: `next-match-sheet/` (nothing existing shows two pick cards with a swipe)
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/queueing/README.md — court-filling rule and the picker; docs/business_logic/product/queue/modules/matches/README.md — what happens after a result
- Database design: none needed (no new stored data)
- Screen docs: docs/screens/product/modules/queue/match-control.md (new Q-NEXT-MATCH section, Surfaces and Q-DISPATCH entry text), docs/screens/product/dialogs.md, docs/screens/product/state-matrix.md, docs/screens/product/navigation.md
- Decision register: docs/mvp/decisions.md — D-2026-11-09-01

## Real app work
- Ships in the same PR as #579: `next-match-sheet` in `@rotra/ui`, wired from the Queue console after Confirm result.
