# Player share images: fill the Story and Facebook post sizes

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › shareCardHTML (class `one`), shareModel (game: `one: true`); `.sh-card.post`, `.sh-card.story`, `.sh-card.one` styles
Route: every Share in ROTRA Player
Screen ID: share dialog (Player)
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: share-card
Supersedes: none
Superseded by: none

## What changed
- Before: on Story (9:16) and Facebook post (4:5) the content sat at the top at the same small sizes as Square, leaving a large empty area above the ROTRA mark.
- After: on those two sizes the middle of the card is centred in the free space and set larger (title 26 px, big numbers 56–64 px, rank 28 px, position 52 px, stat numbers 28 px). Stats run in one row on Post and Square and in a 2×2 grid on Story. A single shared game (Share game) is its own layout: the match is the hero with 44 px faces (34 px on Story), names in the text colour and a 30 px score. The multi-game list keeps its compact rows so it still fits.
- Unchanged: content of every card, Square layout (apart from stats in one row).

## Why
- Owner artifact comment, November 13, 2026: “so much white space in Facebook post and story”.

## Like for like
- Compare at: the three image sizes in the share dialog and full screen.
- States: profile, rank, result, performance, one game, several games; with and without Standing.
- Copy: none
- Tokens: share-card fixed colours.
- Known differences: the downloaded PNG is still drawn top-down by the canvas renderer; matching it to this preview is part of the ticket.

## Reuse plan
- Changes share-card only.
