# Player app: Game page is the court beside a VS card; stats only for a tapped player

Status: IN REAL MODE — #1150
Date: 2026-11-26
App: player
Mockup: apps/mockup/player-app/rotra-player.html › `viewMatch`, `mtPick` action, `.mt-grid`, `.vs-*`, `.mt-figs` styles
Route: /matches/[matchId]
Screen ID: P-MATCH-PAGE
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: match court (unchanged), VS card (new), player stats card (new)
Supersedes: the Before this game card from 2026-11-25-player-match-page.md
Superseded by: none

## What changed
- Before: the court, then a Before this game card listing every player's earlier games.
- After:
  - **[ court ] [ VS card ]** side by side from 900 px, 70% / 30% (owner, same day: "court should be 70% and 30% vs card"), the
    narrow card stacking its teams; stacked on phones (VS card under the court).
  - The left column: the court card (about 80% of the height, a taller court with bigger faces and score; from 900 px each team spread down its half, owner: "re
    arrange the players in the court too much white space on the top") over a
    Session card (about 20%) with the title, date and club (owner, same day: "make court height big, 80% court height,
    and session info will be a card too about 20 percent height").
  - The VS card: format chip, "Tap a player for their stats", both teams (Won / Lost / Not counted, the winner tinted),
    a VS badge with the score. Each player row: picture and name; the picture's ring is the skill group (owner, same day: "remove the skill label, just use the skill borders").
  - Tapping a team's head ("See both") opens one stats card per player of that team, side by side on wide screens; tapping
    one player opens just theirs (owner, same day: "you can click on the pair and opens the players on the bottom, individual
    player opens one card").
  - Tapping a player opens a stats card under both, in the profile card's stats style with its accent grid (owner, same
    day: "use the same style as when you open a profile using the dialog, remember the background grid design"): Win rate
    this session before this game, a year win-rate pill, Played, Wins and Losses, then their earlier games of the session. Tap again or Close to hide. Nothing shows by default.

## Why
- Owner artifact comment, November 26, 2026, on the Game page: "design it like this [ COURT ] [ vs card ], only show stats
  when a person is clicked from the vs card. The person click will show the stats, will show the win rate, will show the
  games played before the match".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: nothing picked; a player picked with earlier games; a first-game player; a guest; a masked private player; signed out.

## Copy
- "Tap a player for their stats" · "Before this game" · "Win rate" · "Played before" · "Record" · "This year" ·
  "This was their first game of the session."

## Docs updated
- screens/product/modules/player-information/match-page.md (layout items 3 and 4).
- business_logic/product/player-information/README.md (match page: what it shows).
