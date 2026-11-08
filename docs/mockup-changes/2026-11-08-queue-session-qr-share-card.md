# Session QR becomes a branded share card with a logo in the QR

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › Session QR sheet
Screen ID: Q-PREPARE (Session QR sheet)

## What changed
- Before: a bare QR on white with the club name, date line and link as plain text.
- After: a branded share card, dark with the ROTRA green accent in both themes: club logo and name with
  “is playing badminton”, session title, date, time · venue, the QR with the **club logo (or initials) in
  the middle**, “Scan to join”, the link, and a ROTRA footer (“Run the game.”).
- A **Post | Story** switch sets the card to 4:5 (feed posts) or 9:16 (Facebook and Instagram stories).
  The download button is now “Download image” and names the file with the chosen format.
- The logo covers about 22% of the code width. Real QR generation needs the highest error-correction
  level and a scan test; this prototype uses a placeholder code.

## Why
- Owner comment on the artifact, November 8, 2026: the QR needs branding and looks because it is shared
  in Facebook posts and stories and Instagram stories; asked whether a logo in the middle can be supported.
  It can, with high error correction.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Session QR in the header actions
