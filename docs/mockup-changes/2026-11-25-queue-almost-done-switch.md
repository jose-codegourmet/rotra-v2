# Queue app: an Almost done switch on the Playing court card

Status: NEW
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Courts (Playing court card, `courtsPane`); `almostDoneOf`, `finishOf` (phase `almost`), `endingSoon`; action `toggleAlmostDone`; cleared in `confirmResult`, `confirmInvalid`, `pauseMatch`
Route: /queue/sessions/s-tonight (console: Courts; Generate Queue › Plan Ahead)
Screen ID: Q-CONSOLE, Q-COURTS, Q-AUTO
Artifact: none
Components: court-card, switch, match-card
Supersedes: none
Superseded by: none

## What changed
- **Playing court card:** before, the court drawing was followed by the match line and the expected finish line.
  After, a row right under the court drawing: label **Almost done** on the left, the standard switch on the right
  (accessible name "Almost done, Court N"). Off by default. Only on a Playing card: never on Getting ready or a free
  court. Merged 5v5 cards get it too.
- **While on:** the expected finish line reads "Almost done" in the accent style of "Finishing soon", in place of
  "Ends in about N min", "Finishing soon", "Could end any time" or "Running long".
- **Plan Ahead:** those players count as free soon with 0 minutes left (top of the tie order), whatever the time
  estimate says. A draft waiting for that court reads "Waits for Court N · almost done".
- **Reset:** Match done, Pause match and Mark invalid turn it off; it only ever counts while the match is Playing.
- Toasts: "Match N almost done · Court N", "Match N · Almost done off".

## Why
- Owner decision, November 25, 2026: [D-2026-11-25-02](../mvp/decisions/2026-11-25.md#d-2026-11-25-02). The Queue
  Master asks the players and flips it; ROTRA has no live score.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Playing card with the switch off (expected finish as before) and on ("Almost done", accent); merged 5v5
  Playing card; Getting ready and free cards without the row; Plan Ahead draft "Waits for Court N · almost done";
  after Match done, Pause match or Mark invalid the switch is gone or off.
- Copy: "Almost done" (row label and time line), "Waits for Court N · almost done", toasts above.
- Tokens: none (existing `--accent` for the line; the existing switch).
- Known differences: none.

## Reuse plan
- Reuses as is: switch — the existing switch control; match-card — draft status line wording only.
- Extends: court-card — an Almost done row on the Playing variant and the "almost" expected finish phase.
- New: none.
- Shares work with: [2026-11-23-queue-plan-ahead-court-finish](2026-11-23-queue-plan-ahead-court-finish.md) (expected
  finish and Plan Ahead), [2026-11-25-queue-match-making-factors](2026-11-25-queue-match-making-factors.md).

## Docs updated
- Business logic: [matches](../business_logic/product/queue/modules/matches/README.md) — new "Almost done" section;
  [queueing](../business_logic/product/queue/modules/queueing/README.md) — Plan Ahead pool and tie order.
- Database design: [matches-queue](../database_design/product/queue/modules/matches-queue.md) — proposed
  `matches.almost_done_at` (nullable timestamptz, cleared on leaving `active`).
- Screen docs: [session console](../screens/product/modules/queue/session-console.md) — the row and the time line;
  [match queue](../screens/product/modules/queue/match-queue.md) — Plan Ahead and the draft status line;
  [match control](../screens/product/modules/queue/match-control.md) — Pause match, Mark invalid and Match done clear it.
- Terms: [product terms](../product-terms.md) — Almost done.

## Real app work
- `packages/db` / `@rotra/data`: the `almost_done_at` field (migration needs a decision), a set/clear command, cleared
  by the done, invalid and pause commands; the expected-finish helper returns the Almost done phase; Plan Ahead reads it.
- `@rotra/ui` court-card: the Almost done row (switch) on the Playing variant and the accent line; stories for on/off.
