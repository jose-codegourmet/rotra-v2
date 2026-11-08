# Public page waitlist shows as tiles with queue numbers

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Participants › Waitlist
Screen ID: public session page

## What changed
- Before: under the participant tiles the waitlist was a small numbered text list of masked names, easy to
  miss next to the large tiles.
- After: “Waitlist · N” shows the waitlisted players as the same tiles as the participants: picture with the
  level ring, masked name, slightly dimmed, with the queue number (1, 2, …) in a small badge on the picture.
  Same three per row on a phone and four on wider screens; not capped. The helper line now says players get
  a slot “in this order”.

## Why
- Owner comment on the artifact, November 8, 2026: the waitlist is not shown. The comment sat on the
  participants section where the waitlist list was; it was read as the plain list not reading as shown.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — Waitlist under the grid
