# Start anyway: open a court before its planned start

Status: IN MOCK APP — #325 (PR #333)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console › Session (courts), Start match sheet
Screen ID: Q-COURTS, Q-DISPATCH (D-START-MATCH), D-OPEN-EARLY

## What changed
- A Not open yet court card: "Available from … Matches do not start automatically." with no action →
  "Opens at HH:MM. The court is unavailable before this time." with **Start anyway**, which confirms
  ("Open Court 4 now?" · Cancel / Open now) and then shows the court as Free with
  "Opened early · planned HH:MM – HH:MM". The chip reads Not open yet (was Not started).
- Courts header: **Open all courts now** while any court is not open yet (one confirmation for all).
- Court cards: Edit and Remove move from inline buttons into a ⋯ menu, with **Undo early open**
  (only before the planned start; disabled "A match is on this court" while in game). The card keeps
  one visible action for its state.
- Start match sheet: a "Not open yet" group with Start anyway per court; a queue card's Start stays
  enabled when the match only waits for a court and a court is not open yet.

## Why
- Jose (Nov 1, 2026, #325): the planned start must not block the Queue Master, especially when testing
  Auto Queue before the booking. Owner answers: Open all courts now yes; Undo early open while free;
  ⋯ menu for Edit / Remove / Undo; Start anyway in the Start match sheet; no time window.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — Running and
  Individual court windows; docs/decisions/2026-10-30-queue-flexibility/05-owner-review.md — G2 amendment
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — proposed `opened_early_at`
- Screen docs: session-console.md (Planned start, Court windows), dialogs.md (D-START-MATCH, D-OPEN-EARLY),
  state-matrix.md (Court booking windows)

## Real app work
- Done in #325 on mock data: `SessionCourt.openedEarlyAt`, `openCourtEarly` / `openAllCourtsEarly` /
  `undoCourtEarlyOpen`, `courtOpen` in match.rules, OverflowMenu, CourtCard and StartMatchSheet changes.
  Real-data persistence (Prisma column, Route Handler) is not part of it.
