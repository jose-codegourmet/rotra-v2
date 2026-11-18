# Admin Verification card: “On file” shows the full phone, grouped

Status: IN MOCK APP — PR #957
Date: 2026-11-18
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players › Full profile › Overview › Verification › “Mobile number”
Route: /admin/players/p1
Screen ID: A-PLAYER-DETAIL
Artifact: none
Components: admin-player-verification-card
Supersedes: none (amends the “Mobile number” copy line of [2026-11-18-admin-player-verification](2026-11-18-admin-player-verification.md))
Superseded by: none

## What changed
- Before: the Verification card's “Mobile number” check read “On file · +63 917 ••• ••42” (masked).
- After: it reads “On file · +63 917 555 0142”: the full number, grouped with `showPhone`, like every other phone in Admin. “Not on file” is unchanged.

## Why
- Admin always sees the full number ([D-2026-11-16-06](../mvp/decisions.md#d-2026-11-16-06)). The card was the one place in Admin that still masked it. Asked whether it should show the full phone instead, the owner answered on November 18, 2026: “Yes, show full”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a phone on file, no phone (“Not on file”).
- Copy: “On file · <full phone, grouped>”, for example “On file · +63 917 555 0142”.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Extends: `AdminPlayerVerificationCard` (reads the full phone instead of the masked one).
- Reuses as is: `formatPhoneForDisplay` (packages/schema), `VerificationStep`.

## Docs updated
- Business logic: none needed.
- Database design: none needed (no table or column change; the Admin verification read returns the stored phone).
- Screen docs: [players-requests.md](../screens/product/modules/admin/players-requests.md) (the “Mobile number” row).

## Real app work
- Done in the same change, without a ticket (owner's answer above). `AdminAccountVerification` carries `phone` (E.164, or null), in mock mode and from the Admin verification Route Handler; the Player's own verification still gets the masked phone only.
