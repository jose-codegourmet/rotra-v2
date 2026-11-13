# Profile page card matches the profile dialog

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewProfile hero (`.p-hero`)
Route: /player/players/<id>
Screen ID: P-PUBLIC-PROFILE / P-OWN-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-hero (aligned with participant-profile-card)
Supersedes: the #765 hero layout (5:2 banner, picture beside the name below it)
Superseded by: none

## What changed
- Before: a full 5:2 banner, then the picture with the full name beside it and the nickname in quotes.
- After: the same top as the profile dialog: the top half of the banner as a 5:1 strip, the 88 px picture centred on its bottom edge with a surface ring (the pencil to change it stays on the picture, the banner pencil stays top right), then the display name (nickname first) with the full name under it when there is a nickname, then the chips. The rest of the card (Player ID, actions) is unchanged.
- Unchanged: Edit profile's own hero, the club page hero.

## Why
- Owner, November 13, 2026: “profile page card is inconsistent with public profile dialog · see how the card in my profile is not similar to the banner to avatar placement”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile (pencils), another player's profile, no nickname, long names.
- Copy: none
- Tokens: none
- Known differences: none

## Reuse plan
- The real app should share one banner + avatar header between the profile page and the profile card.

## Pass 2 (artifact comment, November 13, 2026: “one row each button”)
- The card's actions stack one per row, full width: on your own profile Edit profile, My player ID, Share profile; on someone else's Compare with me, Share profile.
