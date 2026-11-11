# Start session is online only

Status: IN MOCK APP — #721
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › sticky Start session bar and Start session sheet
Route: /queue/sessions/[id]/prepare
Screen ID: Q-START, D-START-SESSION
Artifact: none
Components: start-session-sheet, start-session-bar
Supersedes: none
Superseded by: none

## What changed
- Before: offline, the Start session sheet showed a notice that starting happens on this device and syncs on reconnect, and Start session still worked; the sticky bar only blocked offline when the session had no downloaded copy.
- After: offline, the sticky bar is disabled with the reason “Starting needs an internet connection.”, and the sheet shows a warning notice “Starting needs an internet connection.” with its primary **Start session** disabled. Other blockers (other active session, missing levels, license) are unchanged.

## Why
- Decision [D-2026-11-07-03](../mvp/decisions.md#d-2026-11-07-03): Start session is online only. Downloading stays for running an already started session offline.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: online (ready), offline (bar blocked, sheet notice with disabled primary).
- Copy: **Starting needs an internet connection.**
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: notice (warn), button (primary, disabled)
- Extends: start-session-sheet (offline disables the primary), start-session-bar (offline blocker text)
- New: none
- Shares work with: none

## Docs updated
- Business logic: none (offline module already lists Start session as online only)
- Database design: none
- Screen docs: docs/screens/product/dialogs.md (D-START-SESSION); docs/screens/product/modules/queue/session-setup.md (Q-PREPARE sticky bar, Q-START)

## Real app work
- `startBlocker` returns “Starting needs an internet connection.” whenever offline; StartSessionSheet shows the notice and disables Start session offline; StartSessionBar story copy aligned.
