# Queue app: “Players can request” formats become tick boxes

Status: TICKETED — #1075
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `viewSetup()` step 2, `.fmt-ticks` / `.fmt-tick`
Route: /queue/sessions/new, /queue/sessions/x-next-full/edit (step 2 · Formats, mode and minimum)
Screen ID: Q-SETUP
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: multi-select tick tile (checkbox square + label)
Supersedes: the pill row from the November 9, 2026 request formats change
Superseded by: none

## What changed
- Before: a segmented pill row (2 v 2 … 5 v 5) where pressed meant allowed. It read like a single-choice switch.
- After: a grid of tick tiles, each with a checkbox square and the format.
  - Ticked: accent box with a check, accent border, light accent tint, bright text.
  - Unticked: empty grey box, grey text. Hover tints the border.
  - Each tile is a `role="checkbox"` button with `aria-checked`. The label adds “· N of 6 on”.
- The single-choice Format pills in Request a match stay a segmented switch.

## Why
- Owner artifact comment, November 19, 2026: “these dont feel obvious and it doesnt feel like a checkbox or buttons to
  tick”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: defaults (2 v 2 on), all on, none on (hint adds “With none on, players can't send match requests.”).

## Copy
- Label: “Players can request · N of 6 on”.
- Hint: “Tick each kind of game a signed-in player can ask for with Request a match. Unticked ones show greyed out on
  their side.”

## Open
- None.

## Docs updated
- docs/screens/product/modules/queue/session-setup.md (step 2, Players can request)
