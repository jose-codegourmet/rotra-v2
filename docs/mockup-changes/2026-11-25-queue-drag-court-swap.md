# Courts: drag a busy court onto another busy court to trade courts

Status: TICKETED — #1118
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Courts tab court cards (`data-swap-court`), cdMove/cdEnd, swapCourts()
Route: /queue/sessions/<live session> (Courts tab)
Screen ID: Q-CONSOLE court cards (session-console.md)
Artifact: none
Components: court card (drag source and drop target)
Supersedes: none (extends 2026-11-19-queue-drag-court-to-free.md)
Superseded by: none

## What changed
- Before: a Getting ready or Playing court's drawing could only be dropped on a free court.
- After: it can also be dropped on another busy one-court court (Getting ready or Playing). The two
  matches trade courts; each keeps its state, players and start time. Toast: "Match 16 now on
  Court 2 · Match 18 now on Court 1". Busy courts get the same dashed outline while dragging (not the
  one being dragged); a merged 5v5 court is not a target and a 5v5 match can't trade.

## Why
- Owner, November 25, 2026: "you can drag to a playing court because sometimes QMs make a mistake of
  putting them in the wrong courts; if I swap court 3 to court 1 it would still work".

## Like for like
- Compare at: 1280 px (mouse) and 375 px (press and hold), dark and light.
- States: Playing onto Getting ready, Playing onto Playing, onto itself (nothing), onto a merged
  court (not a target), changed meanwhile ("Something changed. Review the match again.").
- Copy: the toast above.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Extends: the court drag from 2026-11-19-queue-drag-court-to-free.md. Real mode needs one server
  command that trades the two matches' court usage in one transaction (no court frees, so no Auto
  Queue fill).

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/matches/README.md (Trade courts).
- Database design: none (court usage rows already record each move).
- Screen docs: docs/screens/product/modules/queue/session-console.md (court drawing drag).

## Real app work
- Drop target on busy one-court court cards, a trade-courts command (mock and real), the toast.
