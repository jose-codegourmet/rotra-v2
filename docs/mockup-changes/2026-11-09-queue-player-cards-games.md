# Players view cards show games played and games for the night

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › live session › Players tab
Route: /queue/sessions/[sessionId]
Screen ID: Q-POOL
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: player-card (pc3), player grid
Supersedes: none
Superseded by: none

## What changed
- Before: each card had a small chip line “N played · N queued · N suggested (TAB)” plus a separate “M min wait” chip.
- After: each card shows two big numbers side by side: **played** (games played tonight) and **for the night** (played + queued matches; accent-tinted box). The wait time moves into the status line: “Free · 12 min wait” (available players only). Queued and suggested counts are no longer on the card.
- Cards are roomier: 14 px padding, 10 px inner gap, grid minimum 176 px (was 156 px), 12 px gaps (was 8 px).

## Why
- Owner comment (November 9, 2026): "the problem with this is this adds too much clutter to this information. what really matters the most is Games played and Total Games for night (games played + planned games) but show it in UX standpoint that it is readable and not so cramped. feel free to adjust the player card height"

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: available (Free · M min wait), queued, playing (On Court X, no wait), away (no wait), selected.
- Copy: “played”; “for the night”; status “STATUS · M min wait”; accessible label “G games played, T for the night”.
- Tokens: existing only (`--bg`, `--accent-subtle`, `--accent`, `--fg2`, `--r-sm`).
- Known differences: none

## Reuse plan
- Reuses as is: avatar, switch
- Extends: the Players view player card (stats block replaced by a two-number block)
- New: none
- Shares work with: none

## Docs updated
- Business logic: none (no rule changed)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/session-console.md — Q-POOL player card

## Real app work
- Replace the stats line on the Players view card with the two-number block; move the wait into the status line; widen the grid minimum.
