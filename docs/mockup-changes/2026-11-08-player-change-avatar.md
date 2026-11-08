# Players can change their profile picture

Status: IN MOCK APP — #502
Date: 2026-11-08
App: player
Mockup: apps/mockup/player-app/rotra-player.html › My profile (hero) and Edit profile › Name
Screen ID: P-PROFILE, P-EDIT
Route: /player/players/u1
Components: profile-picture-sheet, player-identity-card, edit-profile-form, player-profile

## What changed
- Before: a player's picture could not be changed anywhere.
- After: on your own profile the large picture has a small edit button on its corner, and Edit profile › Name
  begins with a “Profile picture” row with **Change picture**. Both open a **Profile picture** dialog: the
  current picture, **Upload a photo**, **Use my initials**, and a grid of eight characters. A choice applies
  at once with a toast and does not depend on Edit profile's Save. Other players' profiles show no edit
  control. The new picture also appears on the leaderboard row for the signed-in player.

## Why
- Owner comments on the artifact, November 8, 2026: the player profile should have an option to update
  their avatar (two comments, on My profile and on Edit profile).

## Docs updated
- Business logic: none needed (the profile already carries an optional avatar)
- Database design: none needed (`avatar_ref` already covers a character id or an uploaded file)
- Screen docs: docs/screens/product/modules/player-information/profile.md — profile picture paragraph

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- New `profile-picture-sheet/`; extends `player-identity-card/` and `forms/edit-profile-form/`; reuses `avatar/`, `sheet/`, `button/` and the brand character images
- Extends the existing player profile hooks
- Shares work with: none

## Tickets
- Epic: #502 (P05)
- #521 P05.1 · ProfilePictureSheet and the edit-picture button
- #522 P05.2 · Set the profile picture (upload, initials or character)
- #523 P05.3 · Profile picture on My profile, Edit profile and the leaderboard row
- #542 P05.8 · Profile pictures in the player-avatars Storage bucket
