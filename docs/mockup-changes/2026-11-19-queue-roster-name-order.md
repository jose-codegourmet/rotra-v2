# Queue app: club-facing player lists show the club nickname first, then nickname, then full name

Status: TICKETED — #1048
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `nameB(p)`, `nameParts(p)`; used by `rvRow`, `rvCard`, waitlist rows, can't-make-it requests, minimum-games rows, Add player picker, Change player and No show dialogs
Route: /queue/sessions/s-tonight/prepare (Roster and levels), and the dialogs above
Screen ID: Q-PREPARE, Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player name block in roster rows, roster cards and player lists
Supersedes: none
Superseded by: none

## What changed
- Before: these lists showed the full name only.
- After: the first name present in the order **club nickname → nickname → full name** is bold; the others sit
  under it in one muted line joined by “ · ” (for example **Migo**, then “Migs · Miguel Santos”). A player with no
  nicknames shows the full name only. The club nickname applies to registered players only, as before.
- Public pages keep their own rule (`pubNameHtml`, masking); this change is club-facing only.

## Why
- Owner artifact comment, November 19, 2026, on the Roster and levels list: “when there is a club nickname it
  should appear first … CLUB nickname, nickname, fullname”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a registered player with a club nickname and a nickname; a player with only a nickname; a player with
  neither; list and grid roster views.

## Copy
- Second line separator: “ · ”.

## Open
- None.

## Docs updated
- None: the name order rule is already in the players roster docs (club nickname decision D-2026-11-18-03).
