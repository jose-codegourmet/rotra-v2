# Add player › New player has the same fields in a session as in Saved players

Status: IN MOCK APP — PR #1031
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheet `add` (New player), `confirmNew()`
Route: /queue/sessions/s-tonight/preparation?tab=roster (Add player); /queue/players (Saved players › Add player)
Screen ID: Q-ADD-PLAYER, Q-ROSTER
Components: new-player-form, add-player-sheet, club-picture-field
Supersedes: 2026-11-23-queue-new-player-phone-picture.md (in part: the picture was Saved players only)
Superseded by: none

## What changed
- The session Add player's **New player** tab now has **Profile picture (optional)** at the top, like Saved players ›
  Add player. Both contexts have the same New player fields: picture, name, nickname, email, social link, phone and
  level (the level is required in a session, optional in Saved players, as before).
- In a session the add lands with the roster batch, so the picture is saved once that change has synced. If it can't
  be saved (offline or a failed upload) the player stays added and the toast says to set the picture in Edit details.
- The tabs still differ on purpose: a session also has **Saved players**; Saved players › Add player leaves it out
  because everyone there is already saved.

## Why
- Owner, November 23, 2026: “add player in session and add player in club is inconsistent … they both should have the
  same fields”.

## Docs updated
- Screen docs: queue/players-roster.md (New player fields); business logic queue/modules/players/README.md

## Real app work
- Done in the same PR: NewPlayerForm shows the picture in both contexts; the session add chooses the new saved
  player's id on the device (carried as `clubPlayerId` on the roster operation; the server still derives one when it is
  absent) and saves the picture after the roster batch is sent.
