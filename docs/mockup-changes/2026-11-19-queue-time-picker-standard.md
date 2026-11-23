# Queue app: every time input opens the time picker dialog (Settings court times included)

Status: TICKETED — #1072
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` `courtTimePickers()`, `dtPicker()` (new optional `title`), `SHEETS.timePick`
Route: /queue/sessions/s-tonight?tab=settings, /queue/sessions/s-tonight/prepare
Screen ID: Q-CONSOLE, Q-PREPARE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: date-and-time picker (time field + time dialog)
Supersedes: the native time inputs in 2026-11-19-queue-settings-court-cards.md
Superseded by: none

## What changed
- Before: the Settings court cards used the browser's own time inputs (`<input type="time">`) for **From** and **Until**.
- After: both are the app's time field (clock icon, time, chevron). Tapping one opens the time dialog: the time large
  at the top, AM | PM, hour and minute grids, Done. The dialog title names the court: “Court 1 opens”, “Court 1 open
  until”. From can't be at or after Until. Until must be after From and within 24 hours, and shows “next day” when it
  falls on the next day. Each pick saves at once with the same toasts as before. With **Follows session end** ticked,
  Until is disabled.
- **Standard:** no app uses a native time input. Every time input opens the time dialog. There were no other native
  time inputs left in the Queue, Player or Admin mockups.

## Why
- Owner artifact comment, November 19, 2026, on the Settings courts: “can you make it a standard that time inputs
  open the time picker dialog”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: From and Until dialogs; an Until on the next day; Follows session end on (Until disabled).

## Copy
- Dialog titles: “COURT opens”, “COURT open until”. Toasts unchanged: “COURT opens TIME”, “COURT open until TIME”.

## Open
- None.

## Docs updated
- docs/screens/product/experience-contract.md (date-and-time picker: the standard)
- docs/screens/product/modules/queue/session-console.md (Settings court times)
