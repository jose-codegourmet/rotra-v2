# Player app: games from a not-ranked session show in history but don't count toward the leaderboards or win rate

Status: TICKETED — #1090
Date: 2026-11-20
App: player
Mockup: apps/mockup/player-app/rotra-player.html › profile (Recent sessions, Recent games), Sessions, the session dialog, Games (P-MATCH-HISTORY) second tab, Leaderboard "Who appears here"; fixtures `MIGS_SESSIONS` (new `m6`), helpers `U()`, `NOT_RANKED_NOTE`, `sessRecord()`
Route: /players/u1; /players/u1/sessions; /players/u1/games (second tab); /leaderboard
Screen ID: P-PROFILE, P-MATCH-HISTORY, P-LEADERBOARD
Artifact: none
Components: game-row (note), session-row, chip, notice, tabs
Supersedes: none
Superseded by: none

## What changed
- A new game kind, **not ranked**: the games of a session the club ran with **Record games** off. Sample: Migs's
  "Saturday Doubles Night" at Mandaue Shuttle Society, 9 days ago, 2 won and 1 lost.
- They show everywhere a player's games and sessions show (Recent sessions, Recent games, Sessions, the session
  dialog), with the night's **Won / Lost** and a **Not ranked** chip on the session. The session's own W–L and
  Share performance count them.
- They **don't count** toward the leaderboards' wins, the win rate, the weekly performance chart, the rank or the
  standard-match counts (like fun games).
- Games page: the second tab is now **Fun, partial and not ranked**; each such game carries the note "Not ranked
  session · doesn't count toward win rate or the leaderboards". Empty state: "No fun, partial or not-ranked games."
- Leaderboard "Who appears here": "Fun games, partial games after a substitution, games from not-ranked sessions,
  and invalid games or sessions don't count."

## Why
- Owner, November 20, 2026: "the only difference is those wins wont be part of the recorded wins for leaderboard,
  it wont affect the winrate". Decision: D-2026-11-20-02.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Migs's profile (Recent sessions includes the not-ranked session), the session dialog for it, the Games
  page on both tabs, the win rate with and without it (unchanged).
- Copy: "Not ranked"; "Not ranked session · doesn't count toward win rate or the leaderboards"; "Fun, partial and
  not ranked"; "No fun, partial or not-ranked games."; the "Who appears here" line above.
- Tokens: none
- Known differences: none

## Reuse plan
- Extends: game-row — a note without "· not counted"
- Reuses as is: session-row, chip, notice, tabs
- Shares work with: 2026-11-20-queue-record-games-not-ranked.md

## Docs updated
- Business logic: player-information/modules/ranking/README.md (what counts; leaderboards)
- Database design: through the Queue log (facts are written; reads skip `record_games = false`)
- Screen docs: player-information/README.md (P-MATCH-HISTORY tabs)
- Decision: D-2026-11-20-02

## Real app work
- `apps/player` and `@rotra/data`: a not-ranked kind on history games; the leaderboard, win-rate and rank reads
  exclude it.
