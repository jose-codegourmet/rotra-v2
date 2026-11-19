# Queue app: Settings court cards fill the width, 350 px minimum on wide boxes, two a row on small ones

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `liveSettings()` courts; CSS `.ls-courts`, container `lscourts`
Route: /queue/sessions/s-tonight?tab=settings
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: settings court cards
Supersedes: the 210 px auto-fill court grid in 2026-11-19-queue-settings-layout.md
Superseded by: none

## What changed
- Before: court cards auto-filled at 210 px or more, leaving empty space at the end of the row.
- After: the cards stretch to fill the Courts box. The rule follows the box's own width (a container query), not the
  screen:
  - 1000 px or wider: as many columns as fit at 350 px or more each, stretched to fill the row.
  - Narrower than 1000 px: two cards a row.
  - At 520 px or narrower: tighter padding, From and Until labels above their fields, and smaller time text with
    no picker icon, so the times stay readable in a half-width card.

## Why
- Owner artifact comment, November 19, 2026, on the Settings courts: “let the courts take all the white space · for
  containers more than 1000px minimum of 350px per card · and for small have 2 cards each row”.

## Like for like
- Compare at: 375 px, 768 px, 1280 px and 1440 px, dark and light.
- States: 2, 3, 4 and 6 courts.

## Copy
- None.

## Open
- With four courts on a box about 1100 px wide, 350 px fits three, so the fourth wraps alone. Keep it, or let four
  courts share one row?
- At 375 px the half-width court drawings crop the bottom pair of faces.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Settings row, layout)
