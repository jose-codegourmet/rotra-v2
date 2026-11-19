# Queue app: the live Players card's pencil opens one Edit player form

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console Players tab, sheet `editLive`, shared `picEditor()`
Route: /queue/sessions/s-tonight?tab=roster
Screen ID: Q-CONSOLE, dialog D-EDIT-LIVE-PLAYER
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: sheet; reuse the club nickname field, the picture editor from Edit details, the games stepper from D-SET-GAMES, the segmented control
Supersedes: none
Superseded by: none

## What changed
- Before: the card's pencil, **Set games played…**, opened D-SET-GAMES for that player (games only, with a confirmation step).
- After: the pencil is **Edit player** and opens **Edit NAME**, one form with:
  - **Club nickname (optional)**, registered players only.
  - **Profile picture**, unclaimed players only (the Edit details picture editor; changes apply at once).
  - **Games played**, a − N + stepper with “Now N”.
  - **Availability**, Present · Not here, with a hint when a player in a match is marked not here.
- **Cancel** and **Save changes**; no confirmation step. Toast “Changes saved · NAME” or “No changes”.
- **Set games for all…** in the Players header still opens D-SET-GAMES with its confirmation.

## Why
- Owner artifact comment, November 19, 2026: “improve this form”; it should update the club nickname, the photo if
  unclaimed, games played and availability.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: a registered player (nickname field, no picture), an unclaimed player (picture, no nickname field), a guest
  (neither); Not here picked for a player in a match; save with and without changes.

## Copy
- Title “Edit NAME”; labels “Club nickname (optional)”, “Profile picture”, “Games played”, “Availability”; options
  “Present”, “Not here”; buttons “Cancel”, “Save changes”.
- Hint: “NAME is in a match now. Marking them not here doesn't take them off it.”
- Toasts: “Changes saved · NAME”, “No changes”.

## Open
- Guests: the owner named unclaimed players for the photo. Guests can already get a club picture in Edit details. Should
  this form show the picture for guests too?
- Dropping the confirmation step for one player's games: the owner may want it back.

## Docs updated
- docs/screens/product/dialogs.md (new D-EDIT-LIVE-PLAYER; D-SET-GAMES opener)
- docs/screens/product/modules/queue/session-console.md (Player card)
