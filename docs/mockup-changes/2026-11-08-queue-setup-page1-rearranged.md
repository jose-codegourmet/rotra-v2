# Session setup page 1 rearranged: venue up, steppers side by side, court times folded

Status: IN MOCK APP — #501
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create / Edit session › step 1 (Date, venue and courts)
Screen ID: Q-SETUP
Route: /queue/sessions/new
Components: session-setup-form, session-setup, add-court-form

## What changed
- **Details order.** Before: title, date, start, end, repeats, then venue last. After: title, **venue**, then
  date, start, end, repeats and the clash warning. Where you play comes before when.
- **Courts.** Before: the court count stepper, then every court's label with four time pickers, then the
  players-per-court stepper, so two or three courts made a long wall of fields. After: two stepper cards
  side by side (**Courts booked**, **Players per court**), the slots summary, and a court picture per court (see 2026-11-08-queue-setup-court-pictures.md); court names and times are edited in a
  dialog opened from the picture. All fields and rules are unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: rearrange this; it looks bad for UX.
  The comment sat on the whole step 1 section, so the rearrangement is my reading of what was wrong.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — step 1 Details and Courts rows

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `forms/session-setup-form/`; reuses `count-stepper/`, `setup-court-picture/`, `date-time-picker/`, `sheet/` as is
- Shares work with: `2026-11-08-queue-setup-court-pictures`, `2026-11-08-queue-setup-time-fields-layout`, `2026-11-08-queue-setup-when-block`, `2026-11-08-queue-time-field-dialog`

## Tickets
- Epic: #501 (Q16)
- #519 Q16.3 · Session setup step 1: venue first, when block with Total duration, steppers side by side, Edit Court dialog
- #520 Q16.4 · Create / Edit session and every time field use the new controls
