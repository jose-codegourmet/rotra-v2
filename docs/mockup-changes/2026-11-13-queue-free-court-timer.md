# Free courts show how long they have been free

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › freeSince, freeChip, mEnd; console court cards, public “Courts now”, replay courts
Route: /queue/sessions/<id> (console), /queue/s/<session> (Courts now, How the night went), session record replay
Screen ID: Q-CONSOLE courts, Q-PUBLIC courts, replay
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court-card status chip
Supersedes: the plain “Free” chip
Superseded by: none

## What changed
- Before: a free court said “Free”.
- After: “Free · N min”, the minutes since the last match on that court ended (or since the court opened / the session started when nothing has played there yet), coloured like waiting players: neutral under 10 min, amber from 10, red from 16. In the replays the count is relative to the replay's time. “Not open yet” / “Not started” stay as they were.
- Fixed in the replay: a match whose recorded end is missing or implausible (more than 90 minutes after its start, e.g. a night finished days later) now ends at the next start on its court or after 20 minutes, so the replay no longer shows matches “on court” for thousands of minutes or a timeline that runs into the next day.

## Why
- Owner, November 13, 2026: “free courts should have a timer on how long in minutes they were out” (with a replay showing “#46 · 2659 min”).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: just freed (0 min), 10+ (amber), 16+ (red), never used this session, closed court, replay at several times.
- Copy: “Free · N min”.
- Tokens: chip warn and bad colours.
- Known differences: none

## Reuse plan
- Extends the court-card status chip.
