# Saved players: Add player without a session

Status: IN MOCK APP — #330 (PR #367)
Date: 2026-11-01
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Saved players header, Add player sheet (`add(sh)` with `sh.club`)
Screen ID: Q-SAVED-PLAYERS, Q-ADD-PLAYER

## What changed
- Saved players header: new primary **Add player**. It opens the same Add player sheet with no
  session (`openAddSaved`).
- The sheet's club context: "Adding to your saved players. They won't be added to a session." Tabs are
  Player Information (default) and New player; no Saved players tab, slots, waitlist or "locks
  immediately". **Level for this club (optional)**. The primary reads **Save player**.
- Saving pushes to the saved players only (the level becomes the saved level, `sugg`), toasts "NAME
  saved as a guest" / "… · profile lookup after sync" / "NAME saved · LEVEL", and stays open with "N
  added so far". A profile already saved is refused with "NAME is already in your saved players."
- The prototype keeps no saved-player phones, so it does not show the phone duplicate refusal; the
  app does.

## Why
- Jose (Nov 1, 2026, #330): add a player from Saved players, reusing the session Add player dialog.
  Owner answers: level optional; hide the Saved players tab; pool only, no "Also add to session";
  a matching phone is a hard conflict.

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Entry and identity, add sources
- Database design: none needed (`club_players` already holds the level and added time; persistence is a later ticket)
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Q-SAVED-PLAYERS header, Q-ADD-PLAYER club context

## Real app work
- Done in #330 on mock data: `AddPlayerSheet` / `NewPlayerForm` / `PlayerConfirmCard` `context: 'club'`;
  `addNewSavedPlayer` and `addDirectoryPlayerToClub` with a shared `createClubPlayer` /
  `clubPlayerForProfile`; the `AddPlayer` container moved to `(operator)/_components` with an
  optional session. No real-data endpoint.
