# Player: Tap a picture avatar to see the full photo in a black-overlay dialog (#716, proposed)

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile photo (hero), Your position card, Compare, Edit profile › Profile picture; full-photo dialog
Route: /player/players/u1 (tap the big photo); also /player/players/b0, /player/compare
Screen ID: P-PUBLIC-PROFILE, P-OWN-PROFILE, P-COMPARE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: avatar (new optional view behaviour), photo-viewer dialog
Supersedes: none
Superseded by: none

## What changed
- Before: avatars were not tappable except where a row opens a profile.
- After: every avatar that shows a real picture (an uploaded photo or a chosen character, never initials) opens a full-photo dialog: black backdrop, photo centred, **×** top right. It closes on a tap anywhere on the overlay, the **×**, or Esc. Where an avatar tap already opens a profile (leaderboard rows, the Top three podium, club member rows), that stays; the photo opens from the big photo inside the profile. Avatars outside a profile-opening tap target open the viewer: profile photo (own and other), Your position card, Compare people, Edit profile picture preview. Initials do nothing. A picture that is masked for the viewer (always-private player, see the visibility log) shows initials, so there is nothing to enlarge.
- The public session page lives in the Queue prototype and is not covered here.
- Proposed, built to the recommended option of the owner decision pack; the owner has not approved it yet.

## Why
- Ticket #716, Jose: “all avatars has the option to click the avatar to view the full photo ( open a dialog with black overlay )”.
- Recommended answers built: Q1 A everywhere an avatar shows a picture, one behaviour in the shared Avatar component; Q2 A only for a real picture, initials do nothing; Q3 A the profile stays the tap target, the photo opens from inside the profile; Q4 A whoever can already see the picture can enlarge it; Q5 A overlay tap, × or Esc.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: photo avatar (button, zoom-in cursor, keyboard focus ring), character avatar, initials (no button), open viewer, closed by overlay, by ×, by Esc; focus moves to the dialog title and the page is locked while open; reduced motion (no fade).
- Copy: accessible names only: **View full photo of <name>** (avatar button), **Photo of <name>** (dialog title and image), **Close photo** (×).
- Tokens: new --viewer-bg #000000 and --viewer-fg #ffffff, the same in dark and light (the overlay is always black)
- Known differences: none

## Reuse plan
- Reuses as is: the existing dialog open and close handling (scrim tap, Esc).
- Extends: Avatar with an optional view behaviour (renders a button when there is a real picture and the picture is not masked).
- New: photo-viewer dialog (full black overlay, not a sheet).
- Shares work with: the Admin avatar photo viewer log (same dialog) and the Queue log for the same ticket, if one exists.

## Docs updated
- Business logic: none yet — proposal pending owner approval; business/screen docs follow when approved
- Database design: none yet — proposal pending owner approval; business/screen docs follow when approved
- Screen docs: none yet — proposal pending owner approval; business/screen docs follow when approved

## Real app work
- One behaviour in the shared Avatar component in @rotra/ui plus one PhotoViewer dialog; use it on every avatar with a real picture, and not on avatars inside a profile-opening tap target. No viewer when the picture is masked for the viewer.
