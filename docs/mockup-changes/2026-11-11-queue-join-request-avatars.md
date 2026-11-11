# Join requests: a signed-in Player's request shows their profile picture

Status: IN MOCK APP — PR #702
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session Preparation › Roster › Join requests (`joinReqCard`)
Route: /queue/sessions/s-tonight/preparation?tab=roster
Screen ID: Q-ROSTER (join requests panel)
Artifact: none
Components: join-requests-panel, avatar
Supersedes: none
Superseded by: none

## What changed
- Before: every join request showed initials, even a request from a signed-in ROTRA Player who has a profile picture (it only appeared once they were on the roster).
- After: a request from a signed-in ROTRA Player (one with an account: “Requested TIME · Shared rank: …”) shows that Player's profile picture, the same face they have on the roster. A Player without a picture, and every guest request, keeps initials.

## Why
- Bug report, November 11, 2026: a signed-in Player's join request shows initials although the Player has a profile picture.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: signed-in Player with a picture (picture); signed-in Player without one (initials); guest request (initials).
- Copy: none changed. The picture's accessible name is “Profile picture of NAME”, as on every other avatar.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: `avatar/` (its `src`), `profile-picture-sheet/profilePicture.ts` (`profilePictureSrc`).
- Extends: `join-requests-panel/` — passes the requesting Player's picture to its avatar.
- New: none.
- Shares work with: 2026-11-09-queue-public-signed-in-names-join (signed-in join requests)

## Docs updated
- Business logic: none needed (the request already carries the Player's account; the picture is read from it).
- Database design: none needed (read through the existing `session_join_requests.player_id` → `players.avatar_ref`).
- Screen docs: none needed.

## Real app work
- Built in the same change, on branch `fix/join-request-avatars`: `SessionJoinRequest` gains `picture` and `pictureName` (read live from the Player's profile in mock and real mode); `JoinRequestsPanel` passes `profilePictureSrc(picture, playerId, pictureName)` to its `Avatar`.
