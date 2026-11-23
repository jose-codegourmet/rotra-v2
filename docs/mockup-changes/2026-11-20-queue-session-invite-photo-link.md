# Queue public page: the Session invite shows the inviter's own picture and an Invite link copy field

Status: IN MOCK APP — PR #992
Date: 2026-11-20
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public session page › Invite › sheet `sessionQr` (Session invite)
Route: /s/<slug> (signed-in Player, confirmed or waitlisted, before Start) › Invite
Screen ID: Q-PUBLIC-JOIN
Artifact: none
Components: share-card (SessionInviteCard), copy-field
Supersedes: none
Superseded by: none

## What changed
- The card's round spot beside "NAME invites you to play" shows the **inviting player's own picture**
  (initials only when they have none). Before: the mockup showed the club logo, and the real app showed the
  inviter's initials because the page never passed the picture.
- Under the card: an **Invite link** copy field (the link with `?invite=<code>`, read-only, copy icon). Toast:
  "Invite link copied"; when the clipboard is unavailable, "Select the link and copy it".
- The QR's centre badge keeps the club logo.

## Why
- Owner, November 20, 2026, on the live Session invite: "my profile pic is not shown"; "there is no share link
  input with copy too".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: inviter with a picture; inviter without one (initials); Post and Story; session full ("Waitlist open").
- Copy: "Invite link"; "Invite link copied"; "Select the link and copy it".
- Tokens: none
- Known differences: the real app keeps Share inside the card (above the field); the mockup has Share in the
  footer.

## Reuse plan
- Reuses as is: SessionInviteCard (its `inviterAvatarUrl` prop already existed), CopyField
- Extends: nothing

## Docs updated
- Business logic: none (no rule changed)
- Database design: none
- Screen docs: docs/screens/product/modules/queue/public-session.md (Session invite sheet)

## Real app work
- Done in the same PR: `PublicSession.tsx` passes the signed-in player's picture; `SessionInviteSheet.tsx` adds
  the CopyField.
