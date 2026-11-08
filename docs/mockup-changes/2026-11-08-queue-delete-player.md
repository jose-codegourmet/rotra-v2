# Saved players: Delete player

Status: ALREADY A TICKET — #487
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players › player profile dialog; D-DELETE-PLAYER
Screen ID: Q-SAVED-PLAYERS

## What changed
- Profile dialog footer: danger **Delete player** for every saved player.
- Not in the Active Session: deletes at once, toast "NAME deleted". Their slot and waitlist spot in
  prepared and upcoming sessions go.
- In the Active Session: **Delete NAME?** dialog (Keep player / Delete player). They're marked not
  present, so waiting matches with them need attention. On court or playing: **Can't delete NAME yet**.
- Deleted players leave Saved players, its stats and Add player; finished sessions keep their name.

## Why
- Owner, November 8, 2026: clubs need to remove players; confirmation only when a live session is
  affected; history and results stay.

## Docs updated
- Business logic: queue/modules/players/README.md (Deleting a saved player)
- Database design: queue/modules/sessions-roster.md (`club_players.removed_at`)
- Screen docs: queue/players-roster.md (Delete player), dialogs.md (D-DELETE-PLAYER)

## Real app work
- Migration adding `club_players.removed_at` (owner signed off November 8, 2026).
- Delete service and route; removed players filtered from saved-player reads; re-adding restores.
- PlayerProfileSheet Delete player button and the D-DELETE-PLAYER dialog.
