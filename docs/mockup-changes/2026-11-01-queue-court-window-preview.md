# Add / Edit court previews show the validated booking window

Status: ALREADY A TICKET — #320
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session › Add / Edit court
Screen ID: Q-ADD-COURT

## What changed
- Preview uses planned start → close for booking length and now → planned start for “opens in”.
- Already-open bookings show time left; passed bookings get a neutral Booking ended notice.
- Invalid windows show submit's inline error and mark its field before submit, without a green ✓.
- Planned start refreshes the preview immediately. Next-day times stay explicit.
- Once live, the actual start bounds new court windows. Default courts open at Start session;
  deliberately staggered starts keep their times, and existing earlier starts survive edits.

## Why
- Fix the misleading close-time countdown and invalid green notice reported in #320.
- Jose confirmed “Use actual start once live” on November 1, 2026.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — actual start and preview behavior.
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — command-boundary clarification; no schema change.
- Screen docs: docs/screens/product/modules/queue/session-console.md — preview states, errors and copy.

## Real app work
- Included in #320: shared court-window preview helper, reactive AddCourtForm, stories, mock Start
  session/court commands and Queue container parity, with regression coverage.
