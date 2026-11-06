# Times always carry their day, one date-and-time picker, and live end-time changes

Status: NEW
Date: 2026-11-06
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session setup, Start session, Live console (header, Courts, Courts and time, Add / Edit court), Session settings, Dashboard
Screen ID: Q-SETUP, Q-START, Q-CONSOLE, Q-COURTS, Q-SESSION-ADJUST, Q-ADD-COURT, Q-PREPARE (live Session settings), Q-HOME

## What changed
- **One date-and-time picker (T1).** Every time field (session start and end, each court's planned start
  and end in setup and Add / Edit court, the new end at Start session, the live end) → day buttons (only
  when the field can fall on more than one day, e.g. **Fri, Nov 6** / **Sat, Nov 7 · next day**) plus a list
  of only the valid times in 15-minute steps. An existing off-grid value (a court opened at 10:42 PM) stays
  listed. Empty court options read “Session start” / “Session end”; a day with nothing valid shows “No times
  left on this day”. Before: clock-only time fields offering every time of day, and ROTRA guessed “next day”
  when the end was earlier than the start.
- **Live end time (T2).** Courts and time: before, only **Extend 30 min** / **Extend 60 min** → a **New end**
  picker (any time after now, later or earlier, up to 24 h after play began) with **Set end time**, keeping
  Extend 30/60 as shortcuts. Toast “Session ends at 9:30 PM · public page updates after sync”. Errors:
  “Choose an end time after now.”; “Court 3 opens 9:30 PM. Pick a later end, or edit that court first.”;
  “Court 2 is booked until 10:00 PM. Pick a later end, or edit that court first.” Copy “Start time is fixed:
  it records when play began.” Courts that follow the session end move with it; set-time courts don't.
- **Header button** **Extend time** → **Courts and time**.
- **Late or other-day start (T3).** Start session after the planned end or on another day than planned
  → notice “This session was planned for 6:00–9:00 PM yesterday. Set a new end time to start.” and a
  required **New end**, pre-filled with now + the planned length rounded up to 15 minutes; Start session
  disabled until it is after now. Toast “Session started · levels locked · ends at 9:30 PM”. Before: the
  session started with its old end, giving “Started 10:42 PM · Ends 9:00 PM” and courts “10:42 PM—9:00 PM”.
- **Every time shows its day (T4).** “9:00 PM” today; “Yesterday 10:42 PM” / “Tomorrow 7:00 PM”
  (lower-case mid-sentence); “Sat, Nov 1 · 9:00 PM” further; ranges ending the next day add “· next day”.
  Session settings during play reads “DATE · Started TIME · Ends TIME” from the actual start.
- **Overdue reminder (T5).** Live header “VENUE · Started 6:02 PM · Ends 9:00 PM · 1 h 20 min left” → after
  the planned end “… · Planned end passed 15 min ago” (warning color), plus a console banner with
  **Set end time** and **Session done**. The dashboard live card says the same (was “past its end time”).
  The session never closes by itself.
- **Club time zone (T6).** Docs rule only: times are shown and entered in the club's time zone
  (Asia/Manila for v1). The prototype assumes device time is club time.
- **Busy court booking line.** A court with a match on it (Getting ready or Playing) → **Booking ended
  HH:MM** in warning once its end has passed, like a free court. Before: always “Until HH:MM”.

## Why
- Owner decision, 2026-11-06 (Jose, “Take all recs”), after the live header read “Started 10:42 PM · Ends
  9:00 PM” for a session planned 6–9 PM on an earlier evening. Summarized as T1–T6 in the
  [business open decisions](../business_logic/product/open-decisions.md#times-and-days).

## Docs updated
- Business logic:
  - docs/business_logic/product/queue/modules/sessions/README.md — setup end with day buttons; new Times
    and days section; late or other-day start; start time fixed; Set end time and overdue reminder;
    Booking ended on busy courts; court windows follow every end change
  - docs/business_logic/product/queue/modules/sessions/flow/session-lifecycle.md — steps 5 and 8
  - docs/business_logic/product/open-decisions.md — Times and days table (T1–T6 + Booking ended); the
    rank-window / ID-date timezone row stays open
  - docs/business_logic/product/queue/README.md — none needed
- Database design (proposals, nothing migrated):
  - docs/database_design/product/queue/modules/sessions-roster.md — `scheduled_end_at` editable after
    start within 24 h of `started_at`; `started_at` fixed; times are full instants; court planned start
    still needs a proposed column
  - docs/database_design/product/command-contracts.md — proposed set-end-time command (Extend 30/60 as
    shortcuts); `startSession` may carry a new end
  - docs/database_design/product/open-decisions.md — display/entry time zone settled; storage stays
    instants
- Screen docs:
  - docs/screens/product/modules/queue/session-setup.md — Starts/Ends, per-court pickers, new
    Date-and-time picker section, Q-START late start, live Session settings header
  - docs/screens/product/modules/queue/session-console.md — header copy and button label, overdue banner,
    Booking ended on busy cards, Q-SESSION-ADJUST Set end time, Q-ADD-COURT pickers
  - docs/screens/product/modules/queue/access-home.md — live card overdue copy
  - docs/screens/product/experience-contract.md — new Times and days section
  - docs/screens/product/state-matrix.md — start-session new end; set end time; overdue row
  - docs/screens/product/dialogs.md — D-START-SESSION late start
  - docs/screens/product/open-decisions.md — Times and days row in Settled November 6, 2026
- Other: docs/product-terms.md — Planned end, Set end time; Booking ended covers busy courts

## Real app work
- A shared date-and-time picker in `@rotra/ui` (day buttons + valid 15-minute times, off-grid value kept),
  with stories in both themes, used by setup, Start session, Courts and time and Add / Edit court.
- Setup and court-window values stored and validated as full instants; drop the clock-only “next day”
  inference.
- A set-end-time command in `packages/data` (any time after now, ≤ 24 h after the actual start; court
  conflicts), with Extend 30/60 calling it; Start session carrying a required new end when late or on
  another day.
- Day-aware time formatting everywhere (today / yesterday / tomorrow / date, “· next day”).
- Live header time left / “Planned end passed N ago”, the console overdue banner, and the dashboard live
  card copy.
- Rename the header button to **Courts and time**.
- Booking ended on Getting ready and Playing court cards.
- Club time zone (Asia/Manila) for display and entry instead of the device's.
