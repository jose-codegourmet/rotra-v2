# Admin app: the player detail shows the player's gender

Status: NEW
Date: 2026-11-19
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › player detail › Overview › Identity
Route: /players/:id
Screen ID: A-PLAYER-DETAIL
Artifact: https://claude.ai/artifact/1Au5cHUNCeZJ3JQNPWXsXz
Components: key-value list (reuse)
Supersedes: none
Superseded by: none

## What changed
- Identity lists **Gender** after Nickname: Male, Female, or “Not added yet”. Read-only.

## Why
- Owner, November 19, 2026: accounts say Male or Female (optional for now), public.
  [D-2026-11-19-01](../mvp/decisions.md#d-2026-11-19-01).

## Like for like
- Compare at: 375 px and 1280 px, dark and light; a player with and without a gender.

## Open
- Whether Admin can edit it (D-2026-11-19-01).

## Docs updated
- docs/screens/product/modules/admin/players-requests.md
