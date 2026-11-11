# Copy invite link on the Share club invite sheet

Status: IN MOCK APP — #708
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Club settings / Home › Share club invite sheet
Route: /queue/club-settings/invite
Screen ID: Q-CLUB
Artifact: none
Components: club-invite-card, share-card
Supersedes: none
Superseded by: none

## What changed
- Before: the sheet had Close, Share and Download image. After: a full-width secondary (outline) **Copy invite link** button sits on its own row directly above the **Share** / **Download image** row. It copies the exact link the QR encodes and the card prints.

## Why
- Owner decision (Jose), issue #708.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: default (Post and Story).
- Copy: **Copy invite link**; toast “Club invite link copied”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: button (secondary), club-invite-card, the Club settings Copy link handler and toast
- Extends: share-card, club-invite-card — `onCopyLink`; ShareCard gains optional `primaryRowAbove` (full-width row above the actions)
- New: none
- Shares work with: 2026-11-09-queue-club-invite-link

## Docs updated
- Business logic: none
- Database design: none
- Screen docs: docs/screens/product/modules/queue/access-home.md — Club invite link row

## Real app work
- ShareCard `primaryRowAbove`; ClubInviteCard `onCopyLink`; ShareClubInviteSheet wires clipboard and toast.
