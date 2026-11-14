# Player app: games badge on every face of a game court

Status: NEW
Date: 2026-11-14
App: player
Mockup: apps/mockup/player-app/rotra-player.html › gameRow(g, who, ctx, at); callers sessionBlock, recentGamesCard, SHEETS_SESSION; `.gm-av`, `.gm-g` styles
Route: /player/players/<id>/games, /player/players/<id> (Recent games), the session matches dialog
Screen ID: P-MATCH-HISTORY
Artifact: none (owner reported it from the live app with a screenshot)
Components: match-court (Player variant), game-row
Supersedes: none
Superseded by: none

## What changed
- Before: each face on a game court was the picture (ringed on the winning side) with the first name on a dark pill under it.
- After: each face also carries a small round badge on its top-right corner with how many games that person had played in that session, this game included (their first game that night reads 1, their third reads 3). The badge is the Queue console's face badge: white with dark digits; on the winning side it turns accent. Accessible name: “NAME, game 3 of that session. View profile”.
- Unchanged: everything else on the court.

## Why
- Owner, November 14, 2026, on the live Player app's Recent games: “second missing, it should show how many x games that person had while playing that match”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: won and lost (badge accent on the ringed side), singles and doubles, a face with a picture and one with initials, phones (16 px badge).
- Copy: digits only; aria “game N of that session”.
- Tokens: badge white with dark digits (`rgba(255,255,255,.9)` / `#0b0b0c`, image-side colours like the name pills); accent and on-accent on the winning side.
- Known differences: the prototype counts the other people's games from the sessions it knows (the profile owner's games), so a partner's or opponent's number can be lower than their real count; the real app counts every match of the session from the match facts.

## Reuse plan
- Reuses as is: match-court (adds an optional per-face `badge`), game-row (passes it through), avatar.
- New: nothing.

## Docs
- Screen doc updated: docs/screens/product/modules/player-information/ranking-history.md (Game row as a court).
- Business logic and database design: nothing became untrue (the count is derived from the stored match facts; no new table or field).
