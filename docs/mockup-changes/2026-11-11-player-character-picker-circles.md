# Profile picture sheet: characters as big circles, 5 in a row, 15 per page

Status: NEW
Date: 2026-11-11
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile picture sheet › Or pick a character
Route: /player/players/u1 (sign in as Migs, tap the pencil on the picture)
Screen ID: P-PROFILE-PICTURE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-picture-sheet, character-picker
Supersedes: none
Superseded by: none

## What changed
- Before: the character grid used small 56 px rounded-square tiles that wrapped to fit, 8 per page.
- After: a fixed grid of **5 circles per row, 3 rows, 15 per page**. Each option is a big circle that fills its column (square aspect ratio, round), with a 3 px accent ring on the chosen one. Previous / Next and “Page 1 of 2” stay. Admin › Profile characters now reads “15 per page” and keeps at least 15 shown so the first page is full.

## Why
- Owner comment on the Player artifact, November 11, 2026: “3 rows, square aspect ratio, but shown in circles, make the items big, like 5 in a row and show 15 per page”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light (at 375 px the five circles are about 56 px each; on wide screens about 90 px).
- States: chosen character (ring), hover/focus, page 1 and page 2, fewer than 15 on the last page.
- Copy: none changed.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: avatar, sheet, pager buttons
- Extends: character-picker (fixed 5-column round grid, page size 15)
- New: none
- Shares work with: Admin log 2026-11-11-admin-image-library-cards (page size shown there)

## Docs updated
- Business logic: `docs/business_logic/product/player-information/modules/identity/README.md` › Character choices come from the Admin library (15 per page, 5 round characters per row; D-2026-11-09-13 changed from 8).
- Database design: none needed.
- Screen docs: `docs/screens/product/modules/player-information/profile.md` › P-EDIT-PROFILE (picture dialog: 15 per page, grid and ring, Admin keeps at least 15 shown).

## Real app work
- `@rotra/ui` CharacterPicker: 5-column round grid, page size 15; Admin page copy and minimum-shown rule follow the same constant.
