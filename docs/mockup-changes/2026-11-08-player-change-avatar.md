# Players can change their profile picture

Status: NEW
Date: 2026-11-08
App: player
Mockup: apps/mockup/player-app/rotra-player.html › My profile (hero) and Edit profile › Name
Screen ID: P-PROFILE, P-EDIT

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
