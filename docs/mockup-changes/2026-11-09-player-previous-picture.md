# The profile picture picker keeps a previous picture

Status: TICKETED — #588
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile picture dialog (Edit profile › Change picture)
Route: /player/profile/edit
Screen ID: P-EDIT-PROFILE
Artifact: none
Components: profile-picture-sheet, avatar
Supersedes: none
Superseded by: none

## What changed
- Before: the picker offered Upload a photo, Use my initials and eight characters; a replaced photo was gone.
- After: the account keeps the current and the previous photo. When a previous photo exists, a "Previous picture" row (thumbnail + **Use previous picture**) sits under the current picture and swaps the two. **Remove** appears next to Use my initials while a photo is set. Choosing a character, initials or Remove makes the last photo the previous one. A hint says only the current and previous photo are kept.

## Why
- Owner decision D-2026-11-09-10: only the current and previous upload are saved, to save storage.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: no previous photo (row hidden); previous photo present; pending upload (row hidden until Done); photo set (Remove shown); character or initials current.
- Copy: Previous picture; Use previous picture; Remove; "Only your current and previous photo are kept. Changes are saved only when you click Done. …"
- Tokens: none (existing tokens only).
- Known differences: none

## Reuse plan
- Reuses as is: `avatar/`
- Extends: `profile-picture-sheet/` (previous-picture row, Remove button, hint)
- New: none
- Shares work with: 2026-11-09-player-private-profile.md (same Player Information screens)

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — two-pictures rule
- Database design: docs/database_design/product/player-information/modules/identity.md — `avatar_previous_ref`
- Screen docs: profile.md (picture picker)
