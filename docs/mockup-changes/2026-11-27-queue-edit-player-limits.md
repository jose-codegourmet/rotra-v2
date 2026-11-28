# Queue Edit player: only four fields; pencil on Roster and levels

Status: IN MOCK APP — PR #1170
Date: 2026-11-27
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `SHEETS.editLive`, `openEditLive`, `saveEditLive`, `rvEdit` (`rvCard`, `rvRow`)
Route: live console › Players › card pencil; preparation › Roster and levels › card and row pencil
Screen ID: D-EDIT-LIVE-PLAYER; Q-ROSTER
Artifact: Queue mockup artifact (republished from this file)
Components: edit-live-player-sheet, edit-pencil-button (new), player-pool-card, roster-card, roster-row, roster-panel
Decision: owner chat, November 27, 2026
Supersedes: the Full name and Profile picture fields of [2026-11-26-queue-edit-player-name.md](2026-11-26-queue-edit-player-name.md) and [2026-11-19-queue-live-edit-player.md](2026-11-19-queue-live-edit-player.md)
Superseded by: none

## What changed
- **Playing session › Players › pencil › Edit player:** the Queue Master edits only **Club nickname**, **Games played**, **Availability** and **Handicap**. Full name and the profile picture / character picker are gone from this sheet.
- **Preparing session › Roster and levels:** each card (Grid) and row (List) gets the green **Edit player** pencil beside the remove ×, the same 28 px accent circle as the live card. It opens the same sheet with **Club nickname** and **Handicap · tonight** only (no Tonight section, no tonight chip).
- A handicap can now be saved while the session is prepared; it applies from the first match and still clears when the session ends.

## Why
- Owner, November 27, 2026 (chat with screenshots of the live card, the Edit Jom sheet and the Roster and levels grid): "QMs can ONLY EDIT: club name, x amount of games, availability, handicap", then "add edit pencil … open like (the Edit sheet) but exclude games tonight and availability". Confirmed: "club name" means the Club nickname field; the preparing handicap clears at session end like the live one.

## Like for like
- Check at 375 px and 1280 px, dark and light: the live Edit sheet (Profile with Club nickname only, Tonight, Handicap) and the Roster and levels pencil (Grid and List) opening the short sheet.

## Reuse plan
- Extends: EditLivePlayerSheet (`mode: 'live' | 'preparing'`; full name and picture removed), RosterCard, RosterRow, RosterPanel (`onEdit`).
- New: EditPencilButton (the pencil, now shared by PlayerPoolCard and the roster card and row); the app container EditPlayer (shared by PlayersView and PreparationRoster).

## Docs updated
- Screen docs: `docs/screens/product/dialogs.md` (D-EDIT-LIVE-PLAYER), `docs/screens/product/modules/queue/session-console.md`, `docs/screens/product/modules/queue/session-setup.md`.
- Business logic: `docs/business_logic/product/queue/modules/players/README.md` (Handicap tonight).
- Database design: `docs/database_design/product/queue/modules/sessions-roster.md` (`handicap_spots` is writable while prepared). No schema change.

## Real app work
- Done November 27, 2026: the components above, mock store and real mode (`setHandicap` accepts prepared and active sessions in `@rotra/data` and `@rotra/db`).
