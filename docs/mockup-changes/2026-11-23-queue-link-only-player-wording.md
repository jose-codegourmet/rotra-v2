# Saved player profile and invite say "a social link" for a player saved without an email

Status: IN MOCK APP — #1019
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheets `profile` (status line), `invite`, `add` (offline notice)
Route: /queue/players (a saved player's profile, Invite)
Screen ID: Q-SAVED-PLAYERS, Q-ADD-PLAYER
Components: player-profile-sheet, invite-sheet, add-player-sheet
Supersedes: none
Superseded by: none

## What changed
- Profile status line for an unclaimed player saved with a social link and no email: “Saved by your club with a social
  link. Not registered with ROTRA yet” (was “… with their email …”, which was untrue for them). With an email it is
  unchanged.
- Invite sheet for the same player: “Your club saved them with a social link. This link lets them turn that record into a
  ROTRA account …”.
- Add player › Player Information offline notice: “Add them as a new player with their email or social link now; ROTRA
  looks them up after you reconnect.”
- The profile's **Email** row already read “None on file” for them; the real app showed “On file and kept private” and
  now follows the mockup.

## Why
- Owner, November 23, 2026: a player saved with a link only (#1019) showed “Saved by your club with their email”.

## Docs updated
- Screen docs: queue/players-roster.md (profile status line, invite text)

## Real app work
- Done in the same PR: PlayerProfileSheet status line, InviteSheet text, AddPlayerSheet offline notice, and
  `emailOnFile` in the real-mode Saved players read (true only when the entry has an email).
