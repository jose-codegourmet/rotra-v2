# Player: the public club page shows Join only to visitors who arrived with an invite link

Status: NEW
Date: 2026-11-19
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Public club page › hero actions (Join this club)
Route: /player/clubs/c1
Screen ID: P-CLUB-PAGE
Artifact: none
Components: club-page-hero
Supersedes: none
Superseded by: none

## What changed
- Before: every non-member saw **Join this club**, which used the club's current invite code. After: the button
  shows only when the visitor arrived with the club's invite link (`?k=` code), and it opens that link with that
  code. A visitor without a code sees the note **Ask the club for an invite link to join.** in its place.
- Members still see **Leave club**; **Share club page** is unchanged.

## Why
- Decision B-55 (docs/backend/open-decisions.md): the public club read no longer sends an invite code, so a visitor
  can only join with the code they arrived with, which the server checks.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: arrived with a code (Join shown); no code (note shown); member (Leave club); signed in and signed out.
- Copy: "Join this club"; "Ask the club for an invite link to join."
- Tokens: none
- Known differences: none

## Reuse plan
- Extends: club-page-hero — the Join slot renders a muted note when no invite code is present

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/player-information/club-page.md — Join behavior

## Real app work
- The Player club page reads `?k=` and passes it to `clubJoinHref`; without it, ClubPageHero shows the note
  instead of the Join link. Real mode already builds `joinHref` without a code.
