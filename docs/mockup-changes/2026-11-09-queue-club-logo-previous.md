# Club logo: Use previous logo (only current and previous are kept)

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Club settings › Club identity › Club logo
Route: /queue/club-settings/club-identity
Screen ID: Q-CLUB
Artifact: none
Components: club-logo, club-settings, button
Supersedes: none
Superseded by: none

## What changed
- Before: Upload/Replace and Remove only. After: when a previous logo exists, a small “Previous logo” thumbnail with **Use previous logo** swaps current and previous. Uploading pushes the current logo to previous; **Remove** makes the current logo the previous one and shows initials. Hint “Only the current and previous logo are kept.”
- Court-picture uploads do not exist in any mockup, so the court-picture part of D-2026-11-09-10 has no mockup change yet.

## Why
- D-2026-11-09-10: "only 2 will be saved: current and previous."

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: no previous logo (no row); previous logo present; after Remove (initials, previous kept).
- Copy: “Previous logo”; **Use previous logo**; “Only the current and previous logo are kept.”; toast “Previous logo restored”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: sheet, button, invite-link row, segmented-control, club-logo
- Extends: session-join-qr — a club variant of the share card
- New: none
- Shares work with: 2026-11-08-queue-session-qr-share-card

## Docs updated
- Business logic: none needed
- Database design: docs/database_design/product/admin/modules/clubs-licenses.md — logo_previous_ref, cleanup, snapshot fallback
- Screen docs: docs/screens/product/modules/queue/access-home.md — Club identity

## Real app work
- Club logo picker, `logo_previous_ref` column, cleanup after upload, snapshot fallback.
