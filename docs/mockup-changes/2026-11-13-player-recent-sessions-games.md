# Profile: Recent sessions, Recent games, and a Sessions page

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › latestSessionsCard, recentGamesCard, viewSessions, sessRow, sessListOf, ACT.openSessions, prototype routes
Route: /player/players/<id> (cards), /player/players/<id>/sessions (new page)
Screen ID: P-PUBLIC-PROFILE / P-OWN-PROFILE, P-SESSIONS (new)
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-sessions-card, profile-games-card, player-sessions-page
Supersedes: the four-row Latest sessions card in 2026-11-13-player-latest-sessions.md
Superseded by: none

## What changed
- Before: one Latest sessions card (four rows) whose All sessions button went to the Games page.
- After: **Recent sessions** (three rows, same row design, opens the session's matches dialog) with **All sessions (N)** going to a new **Sessions** page; then **Recent games** (the three latest games, each the standard game row plus “session · date · club”) with **All games (N)** going to the Games page. The new Sessions page (`/players/<id>/sessions`) lists every session the player joined, newest first, with the same rows; back to the profile; private profiles show the private gate.
- Unchanged: the matches dialog, the Games page, My sessions.

## Why
- Owner artifact comment, November 13, 2026: “should show Recent Sessions, Recent Games · show only 3 items · there should be a player sessions page in each rotra profile”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile, another public profile, private profile (gate), no sessions, no games, fewer than three items.
- Copy: “Recent sessions”, “Recent games”, “All sessions (N)”, “All games (N)”, “Sessions”, “Every club session NAME played in, newest first. Tap one to see the matches.”, “No games recorded yet.”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: session row, game row, matches dialog, page head with back link.
- New: player-sessions-page (route + view).
