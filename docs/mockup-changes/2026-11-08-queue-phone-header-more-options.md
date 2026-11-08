# Preparation header keeps Session QR and Facebook post, rest goes under More options on phones

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation and session settings › header actions
Screen ID: Q-PREPARE

## What changed
- Before: on a phone the header action row wrapped six buttons (Edit preparation, Copy invite link, Session
  QR, Copy Facebook post, Delete session, Cancel session).
- After, at 640 px and narrower: the row shows **Session QR**, **Copy Facebook post** and **More options**.
  **More options** opens a dialog with full-width buttons: Edit preparation (Back to live session during
  play), Copy invite link, and before start Delete session and Cancel session (danger style). Choosing one
  closes the dialog and runs it; Delete and Cancel then open their usual confirmation. Wider screens are
  unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: on mobile the header should show Session QR and Copy
  Facebook post, then More options, which shows a dialog.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — header actions
