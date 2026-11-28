# Start session on an earlier day than planned moves the planned start to now

Status: IN REAL MODE — #1136
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.start (Start session?) and ACT.confirmStart
Route: /queue/sessions/x-next-full/preparation, then Start session (the live example session must end first)
Screen ID: Q-SESSION-PREP › Start session (session-setup.md, D-START)
Artifact: none
Components: start-session-sheet
Supersedes: none
Superseded by: none

## What changed
- Before: starting a session on an earlier day than planned (planned for tomorrow 6:30 PM, started
  today) asked for a New end as an other-day start (T3), saved it, and kept the planned start at
  tomorrow. The end landed before the start, the database refused it
  (`queue_sessions_schedule_check`), and the sheet showed "Something went wrong."
- After: when the planned start is still ahead, Start also moves the planned start to now, so the
  window is now → the new end. Courts that follow the session start open now; a court with its own
  later start keeps it (and one that would open at or after the new end blocks Start with the existing
  "Court 3 opens Thu 8:00 PM. Pick a later end, or edit that court first."). The minimum still freezes
  from the planned window.
- The warning notice adds one sentence in that case: "This session was planned for 6:00–9:00 PM
  tomorrow. Starting now moves its start to now. Set a new end time to start."

## Why
- Owner, November 25, 2026, after "Start session?" failed locally with "Something went wrong." on a
  session planned for tomorrow: chose "Start now, move start" over blocking the start.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: earlier-day start (notice with the extra sentence), later-day or after-end start (notice
  unchanged), same-day start (no notice), court with its own start after the new end (blocks with the
  court message), offline (unchanged).
- Copy: "Starting now moves its start to now." (only when the planned start is ahead).
- Tokens: none.
- Known differences: none.

## Reuse plan
- Extends: start-session-sheet — the notice sentence when the planned start is after now.
- Server: Start session (packages/db session preparation) moves `scheduled_start_at` to now when the
  T3 new end applies and the planned start is after now.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — "Starting on an
  earlier day than planned"; docs/business_logic/product/open-decisions.md — T3 row.
- Database design: none needed (the `scheduled_end_at > scheduled_start_at` check stays).
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Late or other-day start.

## Real app work
- Start session sheet: the extra notice sentence when the planned start is after now.
- Start session command: move the planned start to now in that case, in the same update as the new
  end, so the schedule check holds.
