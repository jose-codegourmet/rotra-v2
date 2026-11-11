# Queue Master can set games played, for one player or everyone

Status: IN PROGRESS — #717
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Live console › Players tab › header button, card icon button and the Set games played sheet
Route: /queue/sessions/s-tonight (Players tab, after Start session)
Screen ID: Q-POOL, D-SET-GAMES
Artifact: none
Components: set-games-sheet, player-pool-card, confirm-sheet, count-stepper, button
Supersedes: none
Superseded by: none

## What changed
- Before: a player's games played came only from completed matches; a Queue Master whose device disagreed with another device's counts could not correct them.
- After: the Players tab header (right side, next to **Add late player**) has a secondary small button **Set games for all…**, and every player card carries a small ghost icon button **Set games played…** (pencil) at the top right of the card. Both open the sheet **Set games played**: a − N + stepper (0–99) prefilled with the player's current count, or with the median count of the roster for all; the line “Auto Queue, Catch Up and fewest-games sorting use the new count right away.”; **Back** / **Next**. Then a confirmation step (D-SET-GAMES): “NAME's games played changes from 3 to 5.” for one player, “Every player on the roster will show N games played.” for all; **Back** / **Set games**. Toast “Games played set · NAME” or “Games played set for 14 players” (offline: the usual “· Saved on this device, waiting to sync” suffix).
- The value stored is an **adjustment** (requested − games counted from matches), so games keep counting up after the override. Displayed games played = counted games + adjustment, floored at 0. The Players tab cards (played and for the night), least/most games sorting, Generate matches (Fewest Games, Catch Up, Available Players loads) and the Leaderboard's Games column read the adjusted count.

## Why
- #717, owner decisions of November 11, 2026: a manual override stored on the shared session (mock and real mode); “Set all” means every roster player shows the same number; a single-player override exists too; both confirm first; Auto Queue, Catch Up, fewest-games sorting, the Players tab cards and the live standings use the overridden counts immediately.
- In the owner's words: “I want the queue master to be able to override the number of games per player. Or the queue master can set all of the current games for all players.”

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: sheet step 1 (one player: Player and Games played now rows; all: “N on the roster”), stepper at 0 (− disabled) and at 99 (+ disabled), step 2 confirmation (one / all), pending (primary spinner), failure (error notice in the sheet), offline toast suffix. Only while the session is live (the Players tab exists only live).
- Copy: **Set games for all…**, **Set games played…**, **Set games played** (title), **Games played**, **Games played now**, **One game fewer** / **One game more** (stepper labels), **Auto Queue, Catch Up and fewest-games sorting use the new count right away.**, **NAME's games played changes from 3 to 5.**, **Every player on the roster will show N games played.**, **Back**, **Next**, **Set games**, **Games played set · NAME**, **Games played set for 14 players**.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: sheet, button (secondary sm; ghost icon button), count-stepper, key-value-list, notice (error), toaster
- Extends: player-pool-card (a Set games played… icon button in the top row, `onSetGames`)
- New: set-games-sheet (two steps: stepper, then the D-SET-GAMES confirmation)
- Shares work with: none

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md (new “Games played override” section); docs/business_logic/product/queue/modules/queueing/README.md (loads read the adjusted count)
- Database design: docs/database_design/product/queue/modules/sessions-roster.md (`session_players.games_adjustment`, migration `20261111000300_roster_games_adjustment`, pending)
- Screen docs: docs/screens/product/modules/queue/session-console.md (Q-POOL header action, card button, sheet); docs/screens/product/dialogs.md (D-SET-GAMES)

## Real app work
- `@rotra/ui` SetGamesSheet; PlayerPoolCard `onSetGames`; `@rotra/data` `gamesPlayed` rule (counted + adjustment), `setGamesPlayed` mutation and `useSetGamesPlayed`; real mode `PATCH /api/sessions/[sessionId]/roster/games` over `@rotra/db` `setGamesPlayed`; PlayersView wiring.
