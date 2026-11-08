# Setup: date, start and end beside a total duration box

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create / Edit session › step 1 › Details
Screen ID: Q-SETUP

## What changed
- Before: Date on its own row, Starts and Ends side by side below it, and the duration as a muted line
  inside the Ends field.
- After: one block. The left column (about 80% of the width) holds the Date field with Starts and Ends side
  by side under it. The right column (about 20%, at least 84 px) is a **Total duration** box with the
  length in large type (“4 HR”, “1 HR 30 MIN”, “45 MIN”, “—” while the end is invalid), as tall as the left
  column. The Ends field keeps a small “next day” note only when the end is on the next day. The time fields
  on this page drop the clock icon to fit the narrower columns.

## Why
- Owner comment on the artifact, November 8, 2026: lay it out with the left side about 80% wide (date, then
  start and end) and the total duration, e.g. “4 HR”, on the right.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — step 1 Details row
