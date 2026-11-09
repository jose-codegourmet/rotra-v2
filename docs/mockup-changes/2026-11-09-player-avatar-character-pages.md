# The profile picture's character picker shows 8 per page with a pager

Status: IN MOCK APP — #588
Date: 2026-11-09
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Profile picture dialog (own profile › Change profile picture, or Edit profile › Change picture) › Or pick a character
Route: /player/profile/edit
Screen ID: P-EDIT-PROFILE
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: profile-picture-sheet, pager
Supersedes: none
Superseded by: none

## What changed
- Before: “Or pick a character” showed one grid of eight characters (`FACES = ['', 'a'..'g']`).
- After: the prototype seeds 24 sample characters (`FACES = ''` plus `'a'..'w'`) and shows **8 per page**. Under the grid a pager (existing `.pager` markup, `data-act="avPage"`): **Previous** · “Page N of 3” (`aria-live="polite"`) · **Next**; Previous is disabled on page 1 and Next on the last page. The grid's group label says “Characters, page N of M”.
- The dialog opens on the page that holds the player's current character (`S.ui.avPage` set in `openAvatar`), otherwise page 1.
- A code comment says the list stands in for the Admin-managed library: only shown characters, in the order set in Admin › Profile characters.

## Why
- Owner comment on the published Player artifact, November 9, 2026: “can this be paginated. the images here will be controlled in the admin app (please update the admin artifact too to support that)”. Decision D-2026-11-09-13.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: page 1 (Previous disabled), a middle page, last page (Next disabled); reopening after choosing a character on page 3 opens on page 3; a photo or initials current opens on page 1.
- Copy: “Or pick a character”; “Previous”; “Page N of M”; “Next”.
- Tokens: none (existing tokens and `.pager`).
- Known differences: the real app reads the shown characters from the Admin library (`profile_characters`), not a fixed list; the page count follows the number of shown images.

## Reuse plan
- Reuses as is: the existing pager pattern (compare-players pages), `avatar/`
- Extends: `profile-picture-sheet/` (paged character grid)
- New: none
- Shares work with: 2026-11-09-admin-profile-characters.md (the library), 2026-11-09-admin-edit-player-everything.md (same 8-per-page picker in Admin), 2026-11-09-player-previous-picture.md (same dialog)

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/identity/README.md — Character choices come from the Admin library
- Database design: docs/database_design/product/player-information/modules/identity.md — `character:<id>` points at `profile_characters`
- Screen docs: docs/screens/product/modules/player-information/profile.md — Profile picture dialog (paged characters)
- Terms: none

## Real app work
- Page the character grid 8 per page with the shared pager; open on the current character's page; load the shown characters from the Admin library.
