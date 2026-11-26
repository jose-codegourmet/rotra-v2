# Admin app: Set gender for the selected players, plus a Gender filter

Status: IN MOCK APP — PR #1101
Date: 2026-11-25
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › selection dock and Filters panel
Route: /admin/players
Screen ID: A-PLAYERS
Artifact: none
Components: admin-player-bulk-bar, admin-player-filters, admin-player-gender-form (new)
Supersedes: none
Superseded by: none

## What changed
- The selection dock gets a **Set gender** button (after Restore). It opens a sheet with Male, Female or Not given and a confirm button. Every selected player changes, registered or unclaimed; each player's result is listed like the other bulk actions.
- The Filters panel gets a **Gender** select: All, Male, Female, Not given.

## Why
- Owner, November 25, 2026 (chat): Admin may set gender for every player; not a spreadsheet; select, choose, confirm; a filter to find players with no gender. Closes the open item in [D-2026-11-19-01](../mvp/decisions/2026-11-19.md#d-2026-11-19-01).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: default, one selected, many selected, offline (button disabled), partial failure, filter with no matches.
- Copy: "Set gender", "Male", "Female", "Not given", "Gender".
- Tokens: none
- Known differences: the mockup applies to the ticked rows of the current page only and shows no failure rows.

## Reuse plan
- Reuses as is: ConfirmSheet, Select, Field
- Extends: admin-player-bulk-bar (new action), admin-player-filters (Gender field)
- New: admin-player-gender-form (sheet with one choice; the change form asks for a reason and RTR confirmations, which gender does not need)

## Docs updated
- Business logic: docs/business_logic/product/admin/modules/player-management/README.md
- Database design: none needed (`players.gender` already exists)
- Screen docs: docs/screens/product/modules/admin/players-requests.md
- Decision: docs/mvp/decisions/2026-11-19.md (D-2026-11-19-01)

## Real app work
- Built in the same change: `PATCH /api/players/gender`, `setAdminPlayersGender` in `packages/db`, `useAdminPlayerMutations().setGender`, the form, the dock button and the filter.
