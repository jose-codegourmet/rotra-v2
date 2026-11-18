# Player app: P-GOOGLE-LINK says Google can be changed, not disconnected

Status: IN MOCK APP — #916
Date: 2026-11-18
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewGoogleLink (copy line); the unused action gDisconnect is removed
Route: /player/connect-google
Screen ID: P-GOOGLE-LINK
Artifact: none
Components: google-link-card
Supersedes: none
Superseded by: none

## What changed
- The last paragraph of P-GOOGLE-LINK: "You can disconnect Google in Privacy and contact." → "You can change your Google account in Privacy and contact."
- The mockup's `gDisconnect` action (nothing in the prototype called it) is removed, so no Google disconnect exists anywhere in the prototype.

## Why
- A copy correction to match [D-2026-11-16-01](../mvp/decisions.md#d-2026-11-16-01): Google "can be changed but not disconnected". The first log ([2026-11-16-player-google-sign-in](2026-11-16-player-google-sign-in.md)) shipped the older line. Owner, November 18, 2026: follow the decision, not the mockup.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: P-GOOGLE-LINK default.
- Copy: "After this you can sign in with Google or with your password. Nothing else on your account changes. You can change your Google account in Privacy and contact."
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: google-identity-row, google-button, auth-card.
- Extends: none
- New: google-link-card (the P-GOOGLE-LINK layout, built in the same ticket as the screen)
- Shares work with: [2026-11-16-player-google-sign-in](2026-11-16-player-google-sign-in.md)

## Docs updated
- Business logic: none needed (it already says "Google can be changed, not disconnected").
- Database design: none needed
- Screen docs: docs/screens/product/modules/player-information/access-registration.md — P-GOOGLE-LINK line.

## Real app work
- none beyond ticket #916, which builds P-GOOGLE-LINK with this copy. The real app matches the mockup in the same change.
