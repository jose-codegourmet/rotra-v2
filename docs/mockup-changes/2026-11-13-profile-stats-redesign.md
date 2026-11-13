# Profile stats: Latest stats on the podium grid, a pixel fire that grows with the win rate

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/queue-app/rotra-queue.html › statsSec; apps/mockup/player-app/rotra-player.html › profileCard; apps/mockup/admin-app/rotra-admin.html › Players › Quick view — all through ppStatsBlock
Route: /queue/sessions/<live session>/console (tap a player); /player/leaderboard (tap a row); /admin/players (click a row)
Screen ID: D-PARTICIPANT-PROFILE, A-PLAYERS (Quick view)
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: participant-profile-card, player-quick-view, profile-stats
Supersedes: none
Superseded by: none

One change across the three apps; logged under `player` because the owner's screenshot was the Player card.

## What changed
- Heading **Stats · 2026** → **Latest stats**, with the year as a small outlined chip on the right (tooltip “Counts 2026 so far; starts again on January 1”). Still the calendar year, reset on January 1.
- Four equal grey tiles (Games, Wins, Losses, Win rate) → a **win-rate ring** (84 px, 72 px under 420 px; conic accent arc on a faint track, the percentage in 20 px bold with “WIN RATE” under it), beside **three counters** (Games, Wins, Losses: uppercase 10 px label, 22 px number, a 3 px top edge — neutral, `--accent`, `--error`; the Wins number in `--accent`, Losses in `--error`), and a full-width **won–lost bar** (6 px, accent and error segments in proportion) with “N won” / “N lost” under it.
- **Simplified the same day** (owner, with a screenshot: “doing too much · maybe simplify it a little bit”): the counters lose their boxes, coloured top edges and coloured numbers, and the won–lost bar and its caption are gone. Now: the ring (the only colour) and three plain counters — uppercase 10 px label over a 22 px number — separated by hairline `--border` dividers.
- **No ring, pixel meter** (owner, same day: “I personally hate the round progress bar” · “can we take inspiration of the pixel flames?”, pointing at the fire behind #1 on the leaderboard podium): the ring is gone. **Win rate** is the first of four plain counters (its number in `--accent`, the others in `--fg`; hairline dividers, the first without one). Under them, a full-width **pixel meter**: 25 square-ended 8 px cells with 3 px gaps; `round(rate / 4)` cells lit in `--accent`, their opacity rising from 0.3 to 1 toward the tip; the tip cell glows (`0 0 10px` accent) and flickers (1.4 s, two steps); two 3 px embers rise 22 px from the tip and fade. Unlit cells are `--fg` at 8%. With reduced motion the tip is still and there are no embers. Accessible name “Win rate N%”.
- **Fire instead of the meter, podium background** (owner, same day, with screenshots of the stats box and the leaderboard podium: “I like that it would have some sort of grid design like the ones in player leaderboard · maybe we can play around with that background · and I dont like the progress bar for win rate actually · I was thinking just 78% (put fire here) bigger the fire bigger percent, small fire small percent”): the 25-pixel meter and its embers are gone. Beside the win-rate number sits a **pixel fire** — an 18 × 22 canvas drawn like the podium's fire (same accent-derived palette, rendered pixelated), from a 16 px ember at 1% to 52 px at 100% (width 0.82 × height), burning hotter as the rate rises; none at 0%; still with reduced motion. The Win rate column is wider (1.7fr against 1fr for the others) so the number and fire fit at 375 px. The box itself takes the podium's look: an 8 px `--accent` grid at 7% over `--surface`, a soft accent glow from the bottom left, and an accent-tinted border.
- **Split 30 / 70** (owner, same day, with a screenshot: “win rate should have its area on the left about 30% · and 70% on the right is: Latest stats --- year · games --- wins --- losses”): the box is a two-column grid (3fr / 7fr). Left: “WIN RATE” label over the percentage in 32 px accent with the fire beside it, divided from the right by a faint accent hairline. Right: the “Latest stats” label and the year chip on one line, then Games, Wins, Losses as three plain counters. Under 420 px the number drops to 24 px and the fire sits **above** it (capped at 40 px tall), so “100%” with the largest fire still fits the left column (checked: 77 px needed of 77 px at 375 px).
- Empty state unchanged: “No games yet this year”.

## Why
- Owner, November 13, 2026, with a screenshot of the stats box: “should be latest stats · and can we redesign the cards and counter here. they look so bland”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: with games; low, middle and high win rates (fire size); 100% (largest fire); 0% (no fire); no games (empty line); reduced motion (fire still); dark and light (palette follows the theme).
- Copy: “Latest stats”, the year chip, “Win rate”, “Games”, “Wins”, “Losses”, “No games yet this year”.
- Tokens: none (uses `--accent`, `--error`, `--fg` mixes).
- Known differences: none

## Reuse plan
- Reuses as is: the `pp-sec` box.
- Extends: participant-profile-card and player-quick-view — the stats slot.
- New: profile-stats — one component for the three apps (counters, the win-rate fire, the grid background); the fire shares its drawing with the podium fire.
- Shares work with: 2026-11-13-profile-card-name-layout.md, 2026-11-13-player-latest-sessions.md

## Docs updated
- Business logic: queue/modules/players/README.md; player-information/README.md (the stats name).
- Database design: none needed.
- Screen docs: dialogs.md; player-information/profile.md; queue/players-roster.md; admin/players-requests.md. Decision D-2026-11-13-03 notes the rename.

## Real app work
- One profile stats component used by the Queue profile cards, the Player profile card and Admin Quick view.
