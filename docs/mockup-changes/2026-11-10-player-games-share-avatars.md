# Games share cards show teams and clear scores

Status: IN MOCK APP — #635
Date: 2026-11-10
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Games › Share games
Route: /player/players/u1/games
Screen ID: P-MATCH-HISTORY
Artifact: none
Components: session-games-share-card, share-card, avatar
Supersedes: none
Superseded by: none

## What changed
- Replace the tiny prose game list with two avatar groups and a prominent score between them.
- Show the owner and partners on the left, opponents on the right; short labels sit below the avatars.
- Show Won or Lost below an entered score; use an em dash and Winner recorded when no score was entered.
- Post shows 3 games, Story 4, followed by +N more games and the complete session W–L total.
- Public players use their pictures; private players and guests keep masked names and initials-only avatars.

## Why
- Owner, November 10: “this would be better if this had images or avatars. and obvious scores … not a bunch of texts”.

## Like for like
- Compare at 375 px and 1280 px, dark and light; fixed dark brand image in both themes.
- States: singles, doubles, fun teams, masked players, missing pictures, missing score, more games, Post and Story.
- Copy: You, Won, Lost, Winner recorded, +N more games, Total W–L.
- Tokens: existing share tokens only.
- Known differences: none.

## Reuse plan
- Reuses Avatar and the ShareCard canvas exporter.
- Extends SessionGamesShareCard with public-safe participant pictures and format-aware content.
- New components: none.
- Incorporated into the existing P06.6 #635 implementation before merge; no new epic.

## Docs
- Screen docs: ranking-history.md updated.
- Business logic and database design: unchanged; this changes presentation and safe read projections only.
