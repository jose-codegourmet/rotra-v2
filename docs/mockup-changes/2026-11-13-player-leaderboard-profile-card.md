# Player leaderboard: tapping a player opens the profile card first

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Leaderboard (podium and rows)
Route: /player/leaderboard
Screen ID: P-LEADERBOARD
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: leaderboard-row, leaderboard-podium, participant-profile-card
Supersedes: none
Superseded by: none

## What changed
- Before: tapping a podium spot or a leaderboard row went straight to that player's profile page.
- After: it opens the same **profile card** dialog as the club page members (banner, picture, name block, chips, About, Stats). **Open full profile** in the card goes to the profile page; **Close** returns to the leaderboard where it was. A private or always-private player opens the private card, as on the club page. The viewer's own row opens their card too.
- Unchanged: the search's full-RTR-ID jump still opens the profile page; **Open my profile** on the “your position” card still goes to the page.

## Why
- Artifact comment, November 13, 2026, on the leaderboard: “when clicking on the players here · please open the profile dialog first before going to their own rotra profile”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: podium spot (1st, 2nd, 3rd); a list row; the viewer's own row; a masked (private) row; Close returns focus to the row; Open full profile leaves for the profile page.
- Copy: none new.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: participant-profile-card (the club page member dialog).
- Extends: leaderboard-row, leaderboard-podium — open the card instead of navigating.
- New: none
- Shares work with: 2026-11-13-profile-card-name-layout.md

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: screens/product/modules/player-information/README.md (P-LEADERBOARD); profile.md (where the card opens from).

## Real app work
- Leaderboard rows and podium open the profile card dialog; the card's Open full profile navigates.
