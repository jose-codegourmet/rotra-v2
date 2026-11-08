# Setup: Starts and Ends side by side, next day becomes a small link

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create / Edit session › step 1 › Details
Screen ID: Q-SETUP

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
