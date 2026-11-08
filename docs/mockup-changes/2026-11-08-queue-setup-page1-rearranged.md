# Session setup page 1 rearranged: venue up, steppers side by side, court times folded

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create / Edit session › step 1 (Date, venue and courts)
Screen ID: Q-SETUP

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
