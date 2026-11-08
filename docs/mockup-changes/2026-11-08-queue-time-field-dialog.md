# Time fields open a time dialog instead of three dropdowns

Status: TICKETED — #501
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › every time field (Session setup Starts and Ends, court planned start and end, Add / Edit court, Start session, live end)
Screen ID: Q-SETUP, Q-START, Q-COURTS, Q-SESSION-ADJUST, Q-ADD-COURT
Supersedes: 2026-11-08-queue-time-picker-hour-minute.md
Superseded by: none
Route: /queue/sessions/new
Components: time-field, date-time-picker, session-setup, add-court-form

## What changed
- Before (see 2026-11-08-queue-time-picker-hour-minute.md): one row of three small native dropdowns, hour :
  minute AM/PM, hard to tap and read on a phone.
- After: one time field showing “7:00 PM” (clock icon, chevron). Pressing it opens a time dialog (bottom
  sheet on a phone): the time in large type, an AM | PM switch, 12 hour buttons, four minute buttons
  (:00 :15 :30 :45) and Done. Each press sets the value at once. Buttons that give no valid time are
  disabled; an off-grid minute stays as an extra button.
- The empty-option switch (“Session start | Set time”) and the day buttons are unchanged. When opened from
  inside another dialog, closing the time dialog returns to it.
- The valid-time rules are exactly as before; only the control changed.

## Why
- Owner comment on the artifact, November 8, 2026: the time fields look really bad for UX; make them better.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md and docs/business_logic/product/open-decisions.md (T1) — wording of the control only; rules unchanged
- Database design: none needed
- Screen docs:
  - docs/screens/product/modules/queue/session-setup.md — Date-and-time picker section
  - docs/screens/product/experience-contract.md — Times and days bullet

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `time-field/` and `date-time-picker/`; reuses `sheet/`, `segmented-control/`, `button/`
- Shares work with: `2026-11-08-queue-setup-court-pictures`, `2026-11-08-queue-setup-page1-rearranged`, `2026-11-08-queue-setup-time-fields-layout`, `2026-11-08-queue-setup-when-block`

## Tickets
- Epic: #501 (Q16)
- #517 Q16.1 · TimeField opens a time dialog
- #520 Q16.4 · Create / Edit session and every time field use the new controls
