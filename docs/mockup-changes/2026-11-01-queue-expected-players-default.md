# Session setup: Expected players follows the slot budget until edited

Status: IN MOCK APP — #331 (PR #352)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Create session / Edit preparation › step 2 · Minimum games
Screen ID: Q-SETUP

## What changed
- New session: Expected players started at a hardcoded 12 → it starts at the slot budget
  (courts × players per court) and follows step 1 live until the QM types a number.
- A typed number sticks through court changes. Clearing the field (and leaving it) follows the slots
  again. Hint: "Follows your N slots until you change it." / "Clear it to follow your N slots again."
- Saving an untouched field stores it empty, so the session keeps following its slots on Edit
  preparation. Saving no longer writes the slot number back into the session.
- Edit preparation: a session with no stored value follows its slots (was `|| roster || 12`).
- Session estimates and cost shares fall back to the slot budget instead of 12 or 1 player.

## Why
- Jose (Nov 1, 2026, #331): with 1 court × 10, step 2 showed 12. Owner answers: follow the slots
  but keep it editable; leave sessions already saved with 12 as they are.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — page 2 row and
  new-session defaults
- Database design: none needed (`expected_players` is already nullable)
- Screen docs: docs/screens/product/modules/queue/session-setup.md — page 2 row and new-session defaults

## Real app work
- Done in #331: `SessionSetupForm` gains `expectedIsAuto`, defaults Expected players to the slot
  budget, keeps it synced while untouched, saves `null` while untouched, and uses
  roster → expected → slots for the step-3 costs. Existing stored values (including 12) load unchanged.
