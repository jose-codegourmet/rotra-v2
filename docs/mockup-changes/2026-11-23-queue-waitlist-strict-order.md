# The waitlist is strictly first come, first served

Status: IN MOCK APP — D-2026-11-23-06
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `rebalanceSlots`, `stepDownToWait`, Setup › Courts budget notice
Route: /queue/sessions/[sessionId] (Waitlist tab), /queue/sessions/[sessionId]/setup
Screen ID: Q-WAITLIST, Q-SETUP, Q-PREPARE
Components: waitlist-panel, session-setup-form (setup-courts-section)
Supersedes: none
Superseded by: none

## What changed
- The waitlist is ordered by when each player joined it. A player moved off the roster (Move to waitlist, Move me to
  the waitlist, a reduced slot budget) joins the **end**, no longer the front.
- Setup › Courts warning when the budget drops below the roster: "… the last N added move to the end of the waitlist
  when you save, in the order they joined." (was "front").
- "Waiting since" shows the time the player joined the waitlist (for a moved-off player, the move time).

## Why
- Owner, November 23, 2026: the waitlist showed Anton, Jarius, Dexter although they joined it as Jarius, Dexter, Anton.

## Docs updated
- Business: queue/modules/players/README.md, open-decisions.md
- Screens: players-roster.md, session-setup.md, state-matrix.md, coverage.md, open-decisions.md
- Database: physical-schema.md (waitlist order)
- Terms: product-terms.md (Move to waitlist)

## Real app work
- Done in the same PR: `orderedWaitlist` (packages/db), its Go twin (apps/api publicreads), the waitlist DTO's
  `addedAt`, the mock store's step-down and budget reduction, and the setup notice copy.
