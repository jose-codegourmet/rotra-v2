# Clubs set profile pictures for guests and unclaimed players

Status: TICKETED — #587
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players › player › Edit details
Route: /queue/saved-players
Screen ID: Q-SAVED-PLAYERS
Artifact: none
Components: edit-player-sheet, avatar, button
Supersedes: none
Superseded by: none

## What changed
- Before: guests always showed initials; unclaimed profiles showed a sample picture the club could not change.
- After: Edit details (guests and unclaimed profiles only) starts with a **Profile picture** field: the current picture (`xl` avatar) and what it is (“A photo”, “A character” or “Initials”), **Upload photo** (any image up to 4 MB, centre-cropped to a 256 px square), **Remove** (shown while a picture is set; back to initials), and **Choose a character**: a grid of eight illustrated faces for that player; the chosen one is outlined. When a previous photo exists, a “Previous picture” thumbnail with **Use previous picture** swaps current and previous (D-2026-11-09-10). Choosing a character or **Remove** makes the last photo the previous one; characters and initials store no file.
- Picture changes apply at once (like the club logo), with a toast, independently of **Save details**.
- The picture shows wherever that player's avatar shows: Saved players, profile dialog, roster, live console, queue and the public page (masked label for visitors, as before).
- Registered players have no Edit details, so the club cannot change their picture.

## Why
- Owner request (November 9, 2026): "Club Owners can set profile pictures to guests and unclaimed players".
- D-2026-11-09-10: only the current and the previous picture are kept.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: guest with initials (no Remove, no previous row); character chosen (outlined, Remove shown); photo set; previous photo present (previous row); after Remove (initials, previous kept); unclaimed with the sample picture.
- Copy: “Profile picture”; “A photo” / “A character” / “Initials”; **Upload photo**; **Remove**; “Previous picture”; **Use previous picture**; “Choose a character”; hint “Shown wherever this player appears in your club. When they claim their profile they can change it. Only the current and previous photo are kept.”; toasts “Picture updated · NAME”, “Using initials · NAME”, “Previous picture restored · NAME”; errors “Choose an image file”, “Choose an image under 4 MB”, “That image could not be read”.
- Tokens: none (existing tokens only).
- Known differences: none

## Reuse plan
- Reuses as is: `avatar/`, button
- Extends: the Edit details sheet (picture field); the avatar resolves a club-set picture
- New: none (the character grid matches the Player app's profile-picture picker)
- Shares work with: 2026-11-09-player-previous-picture.md, 2026-11-09-queue-club-logo-previous.md (same keep-two rule)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Guests and incomplete profiles; open question in docs/business_logic/product/open-decisions.md
- Database design: docs/database_design/product/player-information/modules/identity.md — Profile picture storage note
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Edit details

## Real app work
- Picture field on the Edit details sheet; club-authorised write of `avatar_ref` / `avatar_previous_ref` for its own guests and unclaimed profiles; guest pictures need a storage home (guests have no Player Information profile).
