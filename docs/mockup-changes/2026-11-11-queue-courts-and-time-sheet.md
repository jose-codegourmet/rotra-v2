# Courts and time sheet: lists each court with its status and time; a court's time can change during a match

Status: IN MOCK APP — #756
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live session › Courts and time sheet; court card ⋯ menu
Route: /queue/sessions/s-live (Courts and time)
Screen ID: Q-LIVE (D-COURTS-TIME)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: courts-time-sheet, court-row, court-menu
Supersedes: none
Superseded by: none

## What changed
- Before: the sheet listed the courts as one comma-separated line, said “running matches aren't changed here”, and a court with a match on it could not be edited (the ⋯ menu's **Edit** was disabled with “A match is on this court”).
- After: the sheet shows one row per court: label, a **Playing** / **Getting ready** / **Free** chip, the court's booking line (“Until 10:51 PM”, “Opened early …”, “Booking ended”), and a **Change time** button. Change time opens the existing court sheet, where the planned start stays fixed once the court has been used and the end time (until the session ends, or a set time) and the label can change, even while a match is on. The ⋯ menu item reads **Change time** while a match is on the court and **Edit** otherwise, always enabled. The note now reads “Changing a court's time while a match is on it doesn't touch the match. Occupied courts can't be removed. …”. Add a court… and the session end controls are unchanged.

## Why
- Owner comment on the Queue artifact, November 11, 2026: “this needs to be updated, it should show the courts, and can change the time even [when] someone is playing”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: court free / getting ready / playing; booking ended (warn colour); a court opened early; court sheet opened for a court in use (start disabled with “Start is fixed after use.”).
- Copy: **Courts · N**, **Change time**, **Playing**, **Getting ready**, **Free**, **Changing a court's time while a match is on it doesn't touch the match. Occupied courts can't be removed. Changing mode, formats or the minimum during play hasn't been decided.**
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: chip, list row, the court sheet, court menu
- Extends: courts-time-sheet (court rows), court-menu (Change time while busy)
- New: none
- Shares work with: none

## Docs updated
- Business logic: `docs/business_logic/product/queue/modules/sessions/README.md` › Running (court time changes during a match); `modules/matches/README.md` (editing no longer blocked); `docs/business_logic/product/open-decisions.md` (D3 amended).
- Database design: `docs/database_design/product/queue/modules/sessions-roster.md` › `session_courts` (edit allowed while a match is on the court; start stays fixed once used).
- Screen docs: `docs/screens/product/dialogs.md` › D-COURTS-TIME (new); `docs/screens/product/modules/queue/session-console.md` › Q-SESSION-ADJUST, Q-COURTS (Change time menu item), Court windows and live admission.

## Real app work
- `@rotra/ui` CourtsTimeSheet: court rows with status and Change time; `@rotra/data` `editCourt` no longer refuses a court with a match on it (start locked, end and label editable).
