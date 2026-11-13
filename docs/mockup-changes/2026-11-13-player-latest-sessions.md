# Player profile: Latest sessions, each opening that session's matches

Status: IN MOCK APP — #822
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › profile page, right column card under My sessions (latestSessionsCard) and the sessionGames dialog
Route: /player/players/<id>
Screen ID: P-PUBLIC-PROFILE / P-OWN-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-recent-games, session-matches-dialog
Supersedes: 2026-11-13-player-latest-matches.md
Superseded by: none

## What changed
- The card that listed the three latest matches (Recent games, renamed Latest matches earlier the same day) → **Latest sessions**: the four latest sessions the player played in, newest first. Each row is a button: a 46 px date block (day and month), the session title in bold, “Tue, Nov 10 · Club” muted, then on the right the counted record “2W · 2L” (wins in `--accent`, losses in `--error`) over “N matches”, and a chevron. Header button **All sessions (N)** opens the game history page (already grouped by session). Empty: “No sessions joined yet.”
- Tapping a row opens a **session matches** dialog titled with the session name: a header row with the date block, the date, the club and the counted record (“counted” under it); then “NAME's matches · N” (“Your matches” on the own profile; the name follows the display-name rule) and every match row from that session, fun games marked “Fun game · not counted”. Footer: **Close** and **Session page** (hidden when the session page is no longer available).

## Why
- Owner, November 13, 2026, with a screenshot of the Latest matches card: “in profile it should show latest sessions joined · when they click on the session then they will see their matches from there”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: four or more sessions (four rows, All sessions (N)); fewer; none (empty line, no button); a session with fun games; a session whose page is gone (no Session page button); own profile (“Your matches”).
- Copy: “Latest sessions”, “All sessions (N)”, “No sessions joined yet.”, “NW · NL”, “N matches” / “1 match”, “NAME's matches · N”, “Your matches · N”, “counted”, “Fun game · not counted”, “Session page”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: the club-row button (`crow mbtn`), the date block (`dblk`), the match row (`gameRow`), sheet.
- Extends: profile-recent-games — becomes the sessions list.
- New: session-matches-dialog — a sheet that lists one session's matches for one player.
- Shares work with: 2026-11-13-profile-stats-redesign.md

## Docs updated
- Business logic: none needed (the data is the existing per-session game history).
- Database design: none needed.
- Screen docs: screens/product/modules/player-information/profile.md.

## Real app work
- Replace the recent games card with the latest sessions list and add the session matches dialog, reading the profile's game history grouped by session.
