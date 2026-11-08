# On court step, Auto Queue / Manual Queue court filling, and substitution game credit

Status: IN MOCK APP — #408
Date: 2026-11-06
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console (Courts, Queue, match sheets)
Screen ID: Q-DISPATCH, Q-ON-COURT, Q-ACTIVE-MATCH, Q-SUBSTITUTE, Q-AUTO, session console (Q-COURTS)

## What changed
- **Generator renamed.** The draft workspace and button called **Auto Queue** → **Generate matches**
  in all copy. The queue card's origin label for these matches reads **Generated** (was Auto). Behavior unchanged. Code names (`AutoQueueMode`, `AutoQueueCount`, `autoWorkspace`,
  `Q-AUTO`) stay for now.
- **New match step, On court.** Waiting → **On court** (placed on a court, not started) → **Playing**
  (after **Start match**) → Done / Invalid. Before: starting a match chose the court and started it in
  one step.
- **Q-DISPATCH** “Start match N” → “Put match N on court”, primary **Put on court**. The timer no longer
  starts here.
- **New Q-ON-COURT** (getting-ready sheet): teams with switch sides, **Replace player** (a plain lineup
  change, no substitution record, no credit question), **Move to another court**, **Swap with the queue** (next ready match takes the court; this match takes its queue place; confirmed in a sheet that shows the court before and after, with each player's game count and wait time), **Send back to queue**
  (to the top), and **Start match** (one tap, rechecks presence/busy; “Something changed. Review the
  match again.”; success “Match N started on Court X”).
- **Q-ACTIVE-MATCH** is the Playing sheet; no switching sides there.
- **Court cards:** Free (plain, chip **Free** / Not open yet) · Getting ready (normal border, chip
  **Getting ready**, primary **Start match**, secondary **Open match**) · Playing (steady accent border
  glow, no pulse, chip **Playing** + minutes, **Open match**). Before: Free / In game.
- **Courts header:** new **Manual Queue | Auto Queue** switch, Manual by default. Auto: “Free courts get
  the next ready match. You still start each one.” Auto places, never starts; skips 5v5 and courts not open
  yet. A court whose booking ended still fills (the end is a reminder).
- **Q-SUBSTITUTE:** new step **Who gets this game?**: Nobody (default) · NAME (coming in) · NAME (going
  off), with “Started M min ago”. Match record line “Kiko replaced Jom · Kiko got the game (QM choice)”.
- **Session done:** On court matches that never started are dropped like waiting matches: “N matches
  on court weren't started and will be dropped.” Playing matches still block.

## Why
- Owner product discussion, 2026-11-06 (Jose). Decisions D1–D7 are summarized in the
  [business open decisions](../business_logic/product/open-decisions.md#settled-by-the-product-owner-on-november-6-2026).

## Docs updated
- Business logic:
  - docs/business_logic/product/queue/modules/matches/README.md — lifecycle table, Put on court vs Start
    match, On court actions, substitution game credit
  - docs/business_logic/product/queue/modules/matches/flow/complete-or-invalidate.md — Playing only;
    credit locks at done/invalid
  - docs/business_logic/product/queue/modules/queueing/README.md — rename to Generate matches; Auto Queue
    / Manual Queue court-filling section; switch sides until Start match; Regenerate leaves On court alone
  - docs/business_logic/product/queue/modules/queueing/flow/generate-and-dispatch.md — place, then start
  - docs/business_logic/product/queue/modules/sessions/README.md — court switch, court edit/remove guard,
    Session done drops On court matches
  - docs/business_logic/product/queue/modules/sessions/flow/session-lifecycle.md — steps 6 and 10
  - docs/business_logic/product/queue/modules/results/README.md — credited substitutes count for the
    session, never long-term performance
  - docs/business_logic/product/queue/modules/players/README.md — On court players are busy
  - docs/business_logic/product/player-information/modules/ranking/README.md — credited substitutes stay
    excluded from rank
  - docs/business_logic/product/README.md, docs/business_logic/product/queue/README.md — journey and index
  - docs/business_logic/product/open-decisions.md — Settled November 6, 2026 (D1–D7); Closing a session;
    Partial participation amended; what is still open
- Database design (all proposals, nothing migrated):
  - docs/database_design/product/queue/modules/matches-queue.md — `on_court` state, `placed_at`,
    `started_at` only at Start match, holds at placement, `credit_to`
  - docs/database_design/product/queue/modules/sessions-roster.md — `court_fill_mode`
  - docs/database_design/product/queue/modules/results-publication.md — standings include credited
    substitutes; performance excludes them
  - docs/database_design/product/physical-schema.md — Group F proposal note
  - docs/database_design/product/command-contracts.md — proposed place / send back / move / set court
    fill mode commands; `startMatch` and `substitutePlayer` changes
  - docs/database_design/product/transactions.md — place and start as separate transactions
  - docs/database_design/product/open-decisions.md — November 6, 2026 proposals; offline placement
- Screen docs:
  - docs/screens/product/modules/queue/match-control.md — Q-DISPATCH, new Q-ON-COURT, Q-ACTIVE-MATCH,
    Q-SUBSTITUTE step 3, Q-MATCH-RECORD, acceptance examples
  - docs/screens/product/modules/queue/session-console.md — court card states, glow, Manual/Auto switch
  - docs/screens/product/modules/queue/match-queue.md — Generate matches; Q-AUTO title; Put on court on
    queue cards; switch sides in Q-ON-COURT
  - docs/screens/product/modules/queue/session-finalization.md — D7 copy
  - docs/screens/product/modules/queue/session-setup.md — formats-off warning names Generate matches
  - docs/screens/product/dialogs.md — D-START-MATCH (two steps), D-SUBSTITUTE, D-REGENERATE,
    D-SESSION-DONE
  - docs/screens/product/state-matrix.md — new actions, credit rows, Generate matches rows
  - docs/screens/product/open-decisions.md — Settled November 6, 2026; copy still to take from the mockup
  - docs/screens/product/navigation.md, docs/screens/product/modules/queue/README.md,
    docs/screens/product/coverage.md, docs/screens/product/experience-contract.md — surface lists
- Other: docs/product-terms.md — Generate matches, Auto Queue · Manual Queue, On court, Getting ready /
  Playing, Put on court, Send back to queue, game credit, code names; docs/architecture.md — rename note

## Real app work
- Match status and the placement/start split in `packages/data` rules, hooks and real-mode services
  (place, send back to the top, move court, start from On court; holds and busy players at placement;
  timer from Start match).
- Court card states (Free / Getting ready / Playing) and the steady accent glow in `@rotra/ui`, with
  stories in both themes.
- **Manual Queue | Auto Queue** switch and the Auto fill triggers and skips.
- The On court sheet (Q-ON-COURT).
- The substitute credit step (“Who gets this game?”) and the match-record line.
- Session done copy for dropped On court matches.
- Rename Auto Queue → Generate matches in the UI.
- DB migration for `on_court`, `placed_at`, `credit_to` and `court_fill_mode`.
- Standings, minimum and awards derivation that counts credited substitutes for the session and
  excludes them from long-term performance.
