# Compact player selection and unclipped actions

Status: IN MOCK APP — #392 (PR #394)
Date: 2026-11-01
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players
Screen ID: A-PLAYERS

## What changed
- Player action menus appear above scrolling/clipping containers, remain within the viewport, and scroll when space is limited.
- Player selection uses a compact standalone checkbox, with a hidden player-specific accessible name.
- Card selection sits in the header beside the identity, not in a full-width footer row.
- Desktop targets are 32 px; touch targets are 44 px with 22 px boxes. Focus and checked states remain visible.

## Why
- The owner requested less space for selection in both list and grid views.

## Docs updated
- Business logic: none needed; selection behavior is unchanged.
- Database design: none needed; no data changes.
- Screen docs: docs/screens/product/modules/admin/players-requests.md — compact selection placement and accessible names.

## Real app work
- Render OverflowMenu in a portal with viewport collision handling and keyboard focus management.
- Add a compact Checkbox presentation and stories in @rotra/ui.
- Use it in the player directory selection column and card header; keep existing row checkboxes elsewhere.
