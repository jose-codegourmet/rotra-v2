# Player profile: Recent games → Latest matches

Status: CANCELLED — superseded the same day by 2026-11-13-player-latest-sessions.md before it was built; the mockup now shows Latest sessions
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › profile page, right column card under My sessions
Route: /player/u/<id>
Screen ID: P-PUBLIC-PROFILE / P-OWN-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-recent-games
Supersedes: none
Superseded by: 2026-11-13-player-latest-sessions.md

## What changed
- Card heading **Recent games** → **Latest matches**.
- Button **All games (N)** → **All matches (N)**.
- Empty state “No recorded games yet.” → “No recorded matches yet.”
- The rows are unchanged: the three latest matches, each with result, format, partner, date, club, opponents and score.

## Why
- Artifact comment, November 13, 2026, on this card: “this should be recent sessions or pick a better phrase”. Each row is one match, not a session, so “Recent sessions” would mislabel it; **Latest matches** says what the rows are.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: with matches (three rows and the button), with none (empty line, no button).
- Copy: “Latest matches”, “All matches (N)”, “No recorded matches yet.”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: the card and game rows.
- Extends: none
- New: none
- Shares work with: none

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: screens/product/modules/player-information/profile.md — names the card.

## Real app work
- Rename the heading, button and empty state on the Player profile card.
