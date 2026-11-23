# Saved players: the club gives a guest or unclaimed player a level outside a session, and edits it

Status: NEW
Date: 2026-11-23
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › sheet `profile` (levels note); `editPlayer` and `add` already had the field
Route: /queue/players (Saved players › Add player, a player's profile, Edit details)
Screen ID: Q-SAVED-PLAYERS, Q-ADD-PLAYER
Components: player-profile-sheet, edit-player-details-form, new-player-form, saved-player-card
Supersedes: none
Superseded by: none

## What changed
- The profile's note for a guest or unclaimed player reads “Change their level for this club in Edit details. Each
  session can still set its own.” A registered player's note is unchanged (“Levels are set per session while preparing a
  roster, not here.”).
- The mockup already had **Level for this club (optional)** in Saved players › Add player and in Edit details. The real
  app now matches: Edit details has the field, and in real mode the level chosen in Add player or Edit details is saved
  and shown on the card (it was dropped: real mode only kept levels set in a session).
- Saved players show the level the club gave outside a session or the latest session level, whichever is newer.

## Why
- Owner, November 23, 2026: “the club owner should be able to give them skill level … if they can add skill level during
  adding a player they should be able to edit it also”.

## Docs updated
- Screen docs: queue/players-roster.md (Edit details fields, levels note)
- Database design: queue/modules/sessions-roster.md (`club_players.saved_skill_level_id`, `saved_level_at`)

## Real app work
- Done in the same PR: migration `20261123000300_club_player_saved_level`, saved level on Add player (new and Player
  Information) and Edit details, the card's level, the Edit details field and the profile note. Also fixes the Profile
  picture redrawing while typing (the avatar no longer remounts when the name changes; New player's faces use a fixed
  seed).
