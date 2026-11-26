# Admin sees who is verified in the Players list and every player header

Status: IN MOCK APP — #1037
Date: 2026-11-23
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players (count cards, account switch, list/grid rows), Quick view, Player detail header
Route: /admin/players, /admin/players/[playerId]
Screen ID: A-PLAYERS, A-PLAYER-DETAIL
Artifact: none
Components: player-verification-card (reuse its status chip), admin player list row, admin player quick view, segmented control
Supersedes: none
Superseded by: none

## What changed
- Account chip: a verified player shows **✓ Verified** or **✓ Verified by Admin** (accent) in place of
  **Registered**. A registered player who isn't verified shows **Registered** and **Not verified · N of 3**
  (warning). Unclaimed stays **Unclaimed**. Same chips in list rows, grid cards, the Quick view and the
  player page header (before: always **Registered**, even for a verified player).
- Account switch: All, Registered, **Verified**, **Not verified**, Unclaimed, Details required.
- Count cards: eight, adding **Verified** and **Not verified** after Unclaimed; pressing one filters the list.
  Not verified counts registered players only.

## Why
- Owner, November 23, 2026: "in admin app there should be a way to know who is verified and who is not"
  (D-2026-11-23-07).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: verified, Verified by Admin, registered not verified (0–2 of 3), unclaimed, Details required next to it.
- Copy: "Verified", "Verified by Admin", "Not verified · N of 3", "Not verified" (switch and card).
- Tokens: none (existing ok/warn chips).
- Known differences: none

## Docs updated
- Business: admin/modules/player-management/README.md, player-information/modules/identity/README.md, open-decisions.md
- Screens: admin/players-requests.md
- Database: none (the status is derived from existing fields and the override)
- Terms: product-terms.md (Verified)
- Decisions: D-2026-11-23-07

## Real app work
- #1037: `AdminPlayer.verification` (mock and `readAdminPlayerDirectory`), `PlayerAccountChip` with
  verification, the Verified / Not verified switch options, count cards and URL param. No migration.
