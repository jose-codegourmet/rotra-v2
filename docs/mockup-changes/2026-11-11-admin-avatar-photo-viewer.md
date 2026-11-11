# Admin: Click an avatar or club logo picture to see it in a black-overlay dialog (#716, proposed)

Status: NEW
Date: 2026-11-11
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › Quick view and Edit profile heroes, Player detail hero, Contact change review player card; Club detail hero (logo); full-photo dialog
Route: /admin/players (open Quick view for Miguel Santos), /admin/players/p1, /admin/clubs/c1
Screen ID: A-PLAYERS, A-PLAYER-DETAIL, A-PLAYER-EDIT, A-CONTACT-REVIEW, A-CLUB-DETAIL
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: avatar, club-logo, photo-viewer dialog
Supersedes: none
Superseded by: none

## What changed
- Before: Admin avatars and club logos were not clickable.
- After: an avatar that shows a real picture (an uploaded photo or a chosen character, never initials) opens the same full-photo dialog as the Player app: black backdrop, photo centred, **×** top right, closes on a click anywhere on the overlay, **×** or Esc (Esc closes only the dialog, not the Quick view behind it). In the Players list the row already opens Quick view, so that stays and the photo opens from the big photo in Quick view; the same big photo in Edit profile, the Player detail hero and the player card in a contact-change review also opens it. Club logos follow the same rule: the club detail logo opens when the club has a picture; the fixtures only have initials, so nothing opens today. Initials do nothing.
- Fixtures: three seeded players (Miguel Santos, Bea Castillo, Kat Lim) now have a character picture so the viewer can be seen.
- Proposed, built to the recommended option of the owner decision pack; the owner has not approved it yet.

## Why
- Ticket #716, Jose: “all avatars has the option to click the avatar to view the full photo ( open a dialog with black overlay )”. Owner decision pack answers Q1 A (Queue, Player, Admin), Q2 A (real pictures only), Q3 A (profile stays the tap target; photo opens from inside it), Q4 A, Q5 A (overlay, × or Esc).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: avatar with a picture (button, zoom-in cursor, focus ring), initials (no button), viewer open over Quick view, closed by overlay, by ×, by Esc; focus returns to the avatar that opened it; reduced motion (no fade); club logo with initials (inert).
- Copy: accessible names only: **View full photo of <name>**, **View full logo of <club>**, **Photo of <name>**, **Close photo**.
- Tokens: new --viewer-bg #000000 and --viewer-fg #ffffff, the same in dark and light
- Known differences: none

## Reuse plan
- Reuses as is: the existing Player-app photo viewer dialog (see the player log of the same name).
- Extends: Avatar and club logo with the optional view behaviour.
- New: none (same photo-viewer dialog as the Player app)
- Shares work with: 2026-11-11-player-avatar-photo-viewer.md

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- Use the shared Avatar view behaviour and PhotoViewer dialog on Admin Quick view, Edit profile, player detail, the contact-change review card and the club detail logo; keep row taps opening Quick view and the contact-change review.
