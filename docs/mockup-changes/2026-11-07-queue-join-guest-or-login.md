# Request to join offers Continue as guest or Log in with ROTRA Player

Status: ALREADY A TICKET — #476
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session (guest) › Request to join sheet
Screen ID: Q-PUBLIC-JOIN

## What changed
- Above the form: two choices, **Continue as guest** (selected, the existing form) and **Log in with ROTRA Player** (opens the player login). Hint: "New to ROTRA? Sign-up isn't open yet — continue as a guest for now." No sign-up link.
- The real app returns to the session page with `?join=1`, which reopens the sheet with "You're back — finish your request below." (not shown in the prototype).

## Why
- Owner decision, November 7, 2026: offer the two paths that exist today; player self-registration does not exist yet.

## Docs updated
- Business logic: none needed (a request is still not a booking; logging in never grants a slot)
- Database design: none needed (no schema change)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Request to join sheet

## Real app work
- JoinRequestForm gets playerLoginHref and returned; player login accepts a return to an allowlisted Queue session URL; the public page opens the sheet on `?join=1`. Attaching the signed-in player to the request is a follow-up.
