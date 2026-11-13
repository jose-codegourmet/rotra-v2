# Generate matches leaves out players already in the Main Queue

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › generateDrafts (Generate matches workspace)
Route: /queue/sessions/<id> (Queue tab › Generate matches)
Screen ID: Q-AUTO
Artifact: none
Components: Generate matches batch result (chip / info notice)
Supersedes: Generate counting queued players as available (queued matches only added planned load)
Superseded by: none

## What changed
- Before: Generate matches drew from every present player who was not on court, including players already in waiting matches in the Main Queue (their queued matches only counted as load).
- After: in every tab (Plan Ahead included), a player who is in any waiting match in the Main Queue is not available. Players playing or on court stay out as before (Plan Ahead still includes them). When too few players are free, Generate makes only as many matches as they allow, and the batch result drops its final full stop and adds “ · {q} players are already in the Main Queue” (“1 player is” for one), e.g. “Made 0 of 4: not enough free players for another match · 6 players are already in the Main Queue”. The note shows only when fewer matches were made than asked for and someone was left out for being queued.
- Auto Queue court filling, Suggest and Regenerate are unchanged.

## Why
- Owner decision, November 13, 2026 ([D-2026-11-13-07](../mvp/decisions.md#d-2026-11-13-07)): Generate matches must never count players who are already in the Main Queue as available; with too few free players it makes fewer matches and says how many were left out.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Main Queue empty (full batch, “Made {n} of {n} matches.” chip); most present players queued (shortfall notice with the queued count); one queued player (singular copy); Plan Ahead with queued players; Catch Up with queued players.
- Copy: “ · {q} players are already in the Main Queue” / “ · 1 player is already in the Main Queue”.
- Tokens: existing notice and chip.
- Known differences: none

## Reuse plan
- No new component; the generator's available-player filter and the existing batch result line.
