# Club profile card in the player card's style (Queue, Player, Admin)

Status: NEW
Date: 2026-11-13
App: player
Mockup: apps/mockup/queue-app/rotra-queue.html › SHEETS.clubCard (organizer line on the public page); apps/mockup/player-app/rotra-player.html › SHEETS.clubCard (profile Clubs card); apps/mockup/admin-app/rotra-admin.html › clubCardSheet (Clubs and licenses rows)
Route: /queue/s/<session>; /player/players/<id>; /admin/clubs
Screen ID: D-CLUB-PROFILE (new), Q-PUBLIC, P-PUBLIC-PROFILE, A-CLUBS
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: club-profile-card (new, built on participant-profile-card), player-quick-view
Supersedes: none
Superseded by: none

One change across the three apps; logged under `player`.

## What changed
- New **club profile card**, the same card as a player's (no title bar, top half of the default banner, circular logo centred on the banner edge, frosted ×, bold name with a muted line, chips, About). Contents per app as in D-CLUB-PROFILE.
- Queue public session page: the organizer line (logo + name) becomes a button that opens it (accent ring on the logo on hover/focus). Footer: Close, **Open club page**.
- Player profile Clubs card: a club row opened the club page → opens the card; **Open club page** goes on.
- Admin Clubs and licenses: a row or its name opened the club detail → opens the card in the right-hand panel; **Open club** goes on. The logo is round in the card (square in the list).

## Why
- Owner, November 13, 2026: “since players have player profile dialogs · clubs should also have Club Profile Dialogs · same style too”. Asked: banner strip → “Same banner strip”; where → Queue session page, Players profile Clubs card, Admin Clubs list. Decision [D-2026-11-13-05](../mvp/decisions.md#d-2026-11-13-05).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: live session (Happening now / Running now), next session scheduled, nothing scheduled; viewer is a member (Your club); club with and without a logo; Admin access states (Active, Expired, No license, Free · tester).
- Copy: “ROTRA club”, “Happening now”, “Running now”, “Your club”, “N members”, “Members”, “Sessions in YEAR”, “Next up”, “Nothing scheduled”, “· happening now”, “Based in”, “Founded in”, “Address”, “Set up”, “Plan”, “Until”, “Price”, “Open club page”, “Open club”, accessible name “CLUB, organizer. View club profile”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: participant-profile-card layout, the banner component, player-quick-view panel (Admin).
- Extends: none
- New: club-profile-card — the club variant of the profile card.
- Shares work with: 2026-11-13-profile-card-name-layout.md

## Docs updated
- Business logic: none needed.
- Database design: none needed (clubs have no banner field; the default banner is used).
- Screen docs: dialogs.md (D-CLUB-PROFILE); queue/public-session.md (organizer line); player-information/profile.md (Clubs card); admin/clubs-licenses.md (row action).

## Real app work
- A club profile card component; wire it to the three entry points.
