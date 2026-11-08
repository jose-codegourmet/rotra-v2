# Session setup shows each court as a court picture that opens an edit dialog

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create / Edit session › step 1 › Courts
Screen ID: Q-SETUP

## What changed
- Before: the Courts part was only steppers and form fields, with no picture of what a court is.
- After: under the two steppers each booked court appears as a top-down badminton court (green, white
  boundary lines, singles side lines, service lines, center lines, dashed net) with its label on it.
  A caption under it shows the players budgeted for that court and its planned times (“Session start –
  Session end” unless set). Pressing a picture opens an “Edit Court N” dialog (label, planned start, planned end, Done), so editing a
  court no longer changes the page below. The earlier collapsed “Court names and times” row is gone. A court-time
  error shows under the pictures and in the dialog. Adding or removing
  a court adds or removes a picture; changing players per court updates every caption.
- The court uses the same green and line tokens as the live console court.

## Why
- Owner comment, same day: click the court and have a dialog show up, rather than changing things below.
- Owner comment on the artifact, November 8, 2026: make the courts layout look like an actual court; it
  looked half-baked. Built with the setup page 1 rearrangement logged in
  2026-11-08-queue-setup-page1-rearranged.md.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — step 1 Courts row
