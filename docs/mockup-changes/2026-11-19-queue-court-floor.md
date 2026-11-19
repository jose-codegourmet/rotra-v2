# Queue app: ROTRA court floor and mint court lines (dark theme)

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `--court`, `--court-line`, `--court-tex`, `--court-fo`; `courtSVG`, `setupCourtSVG`, `.pitch`, `.gm-court`, `.sc-svg`
Route: /queue/sessions/s-tonight (Courts, match cards), /queue/sessions/new (Courts step)
Screen ID: Q-CONSOLE, Q-SETUP
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court pitch (court card, match card court, setup court picture)
Supersedes: none
Superseded by: none

## What changed
- Before: courts were a flat mid green (#14603f) with white lines in both themes.
- After, dark theme: a deep green-black mat (Higgsfield gpt_image_2_6 floor texture with soft overhead light pools)
  under the drawn court, and the lines are ROTRA mint (#00FF88 at 72%). The lines stay drawn in SVG so the court
  geometry and player positions are unchanged. Free courts keep the flat grey.
- Light theme: unchanged (flat #2e8b57 with white lines).

## Why
- Owner, November 19, 2026, in the session: “can you update the badminton court designs to match with rotra design?
  use higgsfield please”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: playing, getting ready, free court; match cards; setup court picture.

## Copy
- None.

## Open
- Whether light theme should get its own floor art.

## Docs updated
- None: no rule or field changed.
