# Session setup: only page 3 saves, and Enter acts as Next

Status: ALREADY A TICKET — #332
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create session / Edit preparation wizard
Screen ID: Q-SETUP

## What changed
- Pages 1–2 footer: Cancel/Back · **Create session** (or **Save changes**) · Next → Cancel/Back · Next.
  The only save is the primary **Create session** / **Save changes** on page 3.
- Enter in a field on pages 1–2 acts as **Next**: it checks that page and moves on, or shows the
  errors. Enter on page 3 saves.
- Hint on new sessions: "Create session works from any page" → "Create session is on page 3."

## Why
- Jose (Nov 1, 2026, #332): Next on step 2 created the session before step 3. Owner answers: remove
  the step 1–2 save button ("step 3 save"); Enter works like Next.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — footer, hint and Enter behavior

## Real app work
- Done in #332: `SessionSetupForm` keys the Next and save buttons apart, has no submit button before
  page 3, and routes Enter and form submits on pages 1–2 to Next.
