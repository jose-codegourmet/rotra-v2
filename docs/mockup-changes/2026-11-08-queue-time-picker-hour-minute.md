# Time fields pick hour, minute and AM/PM from three short dropdowns

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session setup (Starts, Ends, court planned start and end), Start session (New end), Courts and time (New end), Add / Edit court (Planned start, Open until)
Screen ID: Q-SETUP, Q-START, Q-COURTS, Q-SESSION-ADJUST, Q-ADD-COURT

## What changed
- **Time row.** Before: the shared date-and-time picker (`dtPicker`) chose the time from one native list of
  up to 96 times. After: one row of three short field-styled dropdowns, **hour** (12, 01 … 11) **:**
  **minute** (00, 15, 30, 45) and **AM/PM**, each with a chevron, fitting a half-width column on a 375 px
  phone. Each change sets the value at once. Named “LABEL: hour”, “LABEL: minute”, “LABEL: AM or PM”.
- **Only valid times, as before.** Options that give no valid time are disabled: an hour with no valid
  15-minute time on the chosen day and half, a minute not valid at the chosen hour, AM or PM with no valid
  time on that day. An off-grid value (a court opened at 10:42 PM) keeps its minute (42) as an extra option
  while it is the value.
- **Changing a part.** Hour keeps the minute when valid, else the hour's first valid minute. AM/PM keeps
  hour and minute when valid in the other half, else that half's first valid time. Day buttons are
  unchanged (keep the clock time when valid on that day, else the day's first valid time).
- **Empty option.** Before: the first entry of the list (“Session start” / “Session end”). After: a
  segmented control “Session start | Set time” (“LABEL: mode”) above the day buttons; while empty, the day
  and time rows are hidden. **Set time** takes the fallback (session start / end) when valid, else the first
  valid time.
- **No valid times** and no empty option: the muted text “No times left on this day” instead of the row.
- An error marks all three dropdowns; a disabled field (Add / Edit court start after use) disables them all.

## Why
- Owner decision, November 8, 2026: the native 96-entry time list was hard to use. The owner chose separate
  hour, minute and AM/PM dropdowns in one row, like a reference picker. Which times are valid is unchanged.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md and
  docs/business_logic/product/open-decisions.md (T1) — “list of times” wording now says hour, minute and
  AM/PM dropdowns; the validity rules are unchanged
- Database design: none needed
- Screen docs:
  - docs/screens/product/modules/queue/session-setup.md — Date-and-time picker section rewritten for the
    empty-option switch, day buttons and the hour : minute AM/PM row; control names
  - docs/screens/product/experience-contract.md — Times and days, one date-and-time picker bullet

## Real app work
- `DateTimePicker` in `@rotra/ui`: replace the time list with the empty-option segmented control and the
  hour / minute / AM-PM dropdowns, same validity helpers, stories in both themes. Already being done in the
  same PR as this mockup change.
