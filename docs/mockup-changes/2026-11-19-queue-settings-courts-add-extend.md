# Queue app: the Settings Courts box gets Add court and Extend buttons instead of Courts and time

Status: TICKETED — #1072
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` courts (`.ls-courts-top`, `.ls-add`)
Route: /queue/sessions/s-tonight?tab=settings, /queue/sessions/s-tonight/prepare
Screen ID: Q-CONSOLE, Q-PREPARE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: settings court cards, Add court tile
Supersedes: none
Superseded by: none

## What changed
- Before: the Courts box header had **Courts and time**. It opened a dialog that listed the same courts and times
  again, plus Add a court and the session end controls.
- After:
  - The header shows “Courts · N” and under it “Session ends TIME · N h left” (or “Planned end passed …” in the
    warning colour). **Extend 30 min** and **Extend 1 h** sit on the right, with the existing toast “Session ends at
    TIME · public page updates after sync”.
  - The last tile in the courts grid (and the last slide on phones) is a dashed **Add court** card, “Set its label
    and hours”. It opens the existing Add court dialog.
  - The **Courts and time** button is gone from this box. The dialog itself stays where it is used elsewhere (the
    console header, Overview, court menus).

## Why
- Owner artifact comment, November 19, 2026, on the box's Courts and time button: “this is so repetitive · can you just
  put add court in this box · and add the buttons on top if we want to extend or not”.

## Like for like
- Compare at: 375 px (slider, Add court as the last slide), 768 px and 1440 px, dark and light.
- States: end still ahead; planned end passed; after Extend; Add court dialog.

## Copy
- “Session ends TIME · STATUS”. Buttons: “Extend 30 min”, “Extend 1 h”. Tile: “Add court”, “Set its label and hours”.

## Open
- Setting an exact end time (not just extending) is still only in the Courts and time dialog. Add a **Set end** time
  field here too?

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Settings row, Courts box)
