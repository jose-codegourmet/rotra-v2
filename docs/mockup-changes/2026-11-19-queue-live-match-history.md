# Queue app: the live console has a Match History tab

Status: IN MOCK APP — #1052
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console tabs, `liveHistoryPane()`, reuses `historyMatch()`
Route: /queue/sessions/s-tonight?tab=history
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: console tab and phone menu item; the session record's match court card (reuse); segmented court filter
Supersedes: none
Superseded by: none

## What changed
- New tab **Match History** between Leaderboard and Settings, with an “N played” chip. Hidden when Record games is off,
  like Leaderboard. It's also in the phone tab menu.
- It lists every finished match tonight (done and invalid), newest first, as the same small courts the session record
  uses: “#N · start–end”, faces with first names, the score or “No score”, the winner highlighted, Invalid desaturated,
  substitution lines under it. Faces open the player's profile.
- A court filter: “All courts · N”, then each court with its count. A match on two courts shows under each.
- Empty: “No finished matches yet. They show here after Match done.”

## Why
- Owner artifact comment, November 19, 2026, on the console tabs: “please add Match History”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; all courts and one court; no finished matches; an invalid match;
  a 5v5 on two courts.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table)
