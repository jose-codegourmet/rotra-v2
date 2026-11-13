# Public session page: every player face opens the profile card

Status: IN MOCK APP — #814
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public session page (viewPublic) › Courts now (courtsNow) and Queue tiles; pubFace helper
Route: /queue/s/<session> as “Signed-in player”
Screen ID: Q-PUBLIC
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public-court-card, public-queue-tile, participant-profile-card
Supersedes: none
Superseded by: none

## What changed
- Before: on the public session page only the Participants tiles opened a player's profile card; the faces on the **Courts now** court drawings and on the **Queue** tiles were plain pictures.
- After: for a signed-in ROTRA player, those faces are buttons too and open the same profile card (D-PARTICIPANT-PROFILE). Accessible name “NAME. View profile” (the name as the page shows it, masked where it is masked), an accent ring on hover and keyboard focus. Always-private, guest and unclaimed players open their limited cards, as from the Participants tab.
- Unchanged: visitors who aren't signed in see plain faces (Courts now and the Queue only show to signed-in players anyway).

## Why
- Owner, November 13, 2026: “in the public view of the Queue session · clicking on player avatars should open the profile dialog”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: court face (Playing, Getting ready, merged court); queue face (#1 and the scrolling rest); registered, always-private, guest and unclaimed players; hover and focus ring; Close returns to the page.
- Copy: “NAME. View profile” (accessible name).
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: participant-profile-card.
- Extends: public-court-card and public-queue-tile — a face can be a button that opens the card.
- New: none
- Shares work with: 2026-11-13-profile-card-name-layout.md

## Docs updated
- Business logic: none needed (who sees which card is unchanged).
- Database design: none needed.
- Screen docs: screens/product/modules/queue/public-session.md.

## Real app work
- Make the faces on the public page's court cards and queue tiles open the profile card for a signed-in player.
