# Edit profile › Links: the four link fields stack one per row

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › My profile › Edit profile › Personal › Links
Route: /player/profile/edit (sign in as Migs from Prototype)
Screen ID: P-EDIT-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: edit-profile-form, text-field
Supersedes: none
Superseded by: none

## What changed
- Before: the four social link fields (Facebook, Instagram, TikTok, YouTube) sat in a two-column grid on wide screens.
- After: they stack one per row at every width, like the rest of the form.

## Why
- Owner comment on the Player artifact, November 11, 2026, anchored on the Links block: "would be better to be 4 rows".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: empty, filled, error under a field; unchanged otherwise.
- Copy: none changed.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: text-field, the form stack
- Extends: edit-profile-form (links section layout)
- New: none
- Shares work with: none

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: `docs/screens/product/modules/player-information/profile.md` › P-EDIT-PROFILE (Links stack one per row); `docs/screens/product/modules/player-information/README.md` › P-EDIT-PROFILE row.

## Real app work
- `@rotra/ui` EditProfileForm: render the links fields in the vertical stack instead of the two-column grid.
