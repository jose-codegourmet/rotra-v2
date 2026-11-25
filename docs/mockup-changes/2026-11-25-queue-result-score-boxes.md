# Match result: two score boxes from the start, no deuce switch

Status: NEW
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.result, scoreEntry(), gameOutcome(), syncScores(), pickScoreWinner()
Route: /queue/sessions/<live session> › Open match › Match done
Screen ID: Q-MATCH › Match N result (match-control.md)
Artifact: none
Components: match-result-sheet (score entry)
Supersedes: the Went to deuce switch and the "Pick the winner first" step from 2026-11-18-queue-scoring-modes.md
Superseded by: none

## What changed
- Before: until a winner was picked the sheet showed only "Pick the winner first. The score is
  optional."; then the winner's side was a fixed "31" and one box took the losing score; a
  **Went to deuce** switch (a **Deuce** toggle per game in 11/21 × 3) swapped in two boxes.
- After: two boxes show from the start and are always typeable. Picking a team fills its box with
  31 (21) and turns it green; the green box can be changed (32 for deuce). Typing the scores picks
  the winner by itself (the higher score, or one box alone at 31 or more). Picking the other team
  after a mistake trades the two scores. No deuce switch anywhere; best-of-3 rows work the same.
- Validation is unchanged in substance (same valid scores per mode); messages now name what to fix:
  "At 30–30 the game goes to deuce: the winner needs a 2-point lead, like 32–30.", "Enter both
  scores, or clear them.", "A game can't end level. One pair needs 31." and others in
  match-control.md.

## Why
- Owner, November 25, 2026: "there is no need for a checkbox if its a deuce, you can automatically
  edit the greenbox"; "when picking for a winner there is no need for this view, it should
  automatically be this" (the score boxes).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: nothing typed; a team picked (31 filled, green); 30–32 typed (B picked by itself); 31–30
  refused in 16/31; 16/31 no deuce refuses 32–30; best of 3 with a split needing Game 3; Clear score.
- Copy: as match-control.md › Q-MATCH result.
- Tokens: none (`--accent`, `--accent-subtle`).
- Known differences: none.

## Reuse plan
- Extends: the result sheet's score entry (both boxes are plain number inputs; the winner one gets
  the accent style). Scoring rules (`validateResult`) unchanged.

## Docs updated
- Business logic: none (valid scores per mode unchanged).
- Database design: none.
- Screen docs: docs/screens/product/modules/queue/match-control.md (result sheet, errors, examples).

## Real app work
- Result sheet: drop the deuce switches and the pick-first step; two boxes always, winner box
  prefilled and editable, winner follows the scores.
