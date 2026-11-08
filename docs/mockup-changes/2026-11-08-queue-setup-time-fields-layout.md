# Setup: Starts and Ends side by side, next day becomes a small link

Status: TICKETED — #501
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create / Edit session › step 1 › Details
Screen ID: Q-SETUP
Supersedes: none
Superseded by: 2026-11-08-queue-setup-when-block.md
Route: /queue/sessions/new
Components: time-field, date-time-picker, session-setup-form, session-setup, add-court-form

## What changed
- Before: Date, Starts and Ends sat in one auto-fit grid. Ends carried two day buttons (“Mon, Nov 9” and
  “Tue, Nov 10 · next day”), so it was taller and left empty space under Starts, and the extra buttons
  looked odd for a rare case.
- After: Date on its own row, then Starts and Ends side by side as two equal fields of the same height.
  Nothing sits under them: the duration moved into the Ends field as a muted second line (“3 h”, or “next day · 5 h”),
  and the next-day choice moved into the Ends time dialog as an **Ends the next day** switch (the first version had a
  “Ends after midnight?” link row under the pair; the owner found it a big button and the duration misplaced).
  The rules (end after start, at most 24 hours) are unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: the fields are badly arranged, there is a lot of white
  space under Starts, and the next-day button on Ends is an edge case.

## Docs updated
- Business logic: none needed (no silent next-day guessing: the day is still chosen, just less prominently)
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — step 1 Details row

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `time-field/` and `date-time-picker/`; reuses `sheet/`, `segmented-control/`, `button/`
- Extends `forms/session-setup-form/`; reuses `count-stepper/`, `setup-court-picture/`, `date-time-picker/`, `sheet/` as is
- Shares work with: `2026-11-08-queue-setup-court-pictures`, `2026-11-08-queue-setup-page1-rearranged`, `2026-11-08-queue-setup-when-block`, `2026-11-08-queue-time-field-dialog`

## Tickets
- Epic: #501 (Q16)
- #517 Q16.1 · TimeField opens a time dialog
- #519 Q16.3 · Session setup step 1: venue first, when block with Total duration, steppers side by side, Edit Court dialog
- #520 Q16.4 · Create / Edit session and every time field use the new controls
