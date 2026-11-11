# Profile page: a public banner across the top of the profile card, like Discord

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Player profile (own and public) › left profile card
Route: /player/players/u1 (own), /player/players/b2 (someone else)
Screen ID: P-PROFILE, P-PUBLIC-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-hero
Supersedes: none
Superseded by: none

## What changed
- Before: the profile card started with the picture and name side by side on a plain surface.
- After: a banner strip (accent gradient from the existing tokens) runs edge to edge across the top of the card; the 88 px picture overlaps its bottom edge with a surface-coloured ring, and the name and nickname sit beside the picture below the banner. Everything else on the card (Player ID, Edit profile / My player ID / Share profile, Compare) is unchanged. The same card is used for your own profile and for another player's public profile.

## Why
- Owner comment on the Player artifact, November 11, 2026, anchored on the profile card: "this part here should show a public banner like discord".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: own profile (camera button on the picture, This is you chip), someone else's profile, photo / character / initials picture, long name wrapping under the banner.
- Copy: none changed.
- Tokens: none new (banner uses --accent-dim, --accent, --accent-subtle; ring uses --surface).
- Known differences: the banner is the accent gradient for everyone. A player-chosen banner image is not proposed here; it would need a decision on uploads and storage.

## Reuse plan
- Reuses as is: card, avatar
- Extends: profile-hero (banner strip, overlapping picture)
- New: none
- Shares work with: the Queue participant profile card (same banner treatment, #731 log)

## Docs updated
- none yet — proposal pending owner approval; screen docs follow when approved

## Real app work
- `@rotra/ui` ProfileHero: banner strip and overlapping avatar; no data change.
