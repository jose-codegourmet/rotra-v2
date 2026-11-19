# Queue and Player apps: ROTRA court colours (dark theme)

Status: NEW
Date: 2026-11-19
App: queue, player
Mockup: apps/mockup/queue-app/rotra-queue.html › `--court`, `--court-line` (used by `courtSVG`, `setupCourtSVG`, `.pitch`,
`.gm-court`); apps/mockup/player-app/rotra-player.html › `--court`, `--court-line` (used by `gmCourtSVG`, Recent games and
match cards)
Route: /queue/sessions/s-tonight (Courts, match cards), /queue/sessions/new (Courts step), player profile Recent games and
match history
Screen ID: Q-CONSOLE, Q-SETUP, and the Player profile and match screens
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh, https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: every drawn court (court card, match card court, setup court picture, player game cards)
Supersedes: none
Superseded by: none

## What changed
- Before: courts were a flat mid green (#14603f) with white lines in both apps.
- After, dark theme: every court is a deep green mat (#0f2a1e) with ROTRA mint lines (#00FF88 at 72%), through the
  shared `--court` and `--court-line` tokens, so all court shapes and sizes change together. Free courts keep the flat
  grey.
- Light theme: unchanged (flat #2e8b57 with white lines). Owner, November 19, 2026: “Keep flat green”.
- A Higgsfield floor texture tried first was dropped: courts are drawn at several aspect ratios, so one image could not
  fit them all (owner: “not everything is at the same ratio so maybe get rid of it”).
- The Admin mockup draws no courts.

## Why
- Owner, November 19, 2026, in the session: “can you update the badminton court designs to match with rotra design?”,
  then “I think you need to do it in all places where the court design is applied”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: playing, getting ready and free courts; match cards; setup court picture; player Recent games cards.

## Copy
- None.

## Open
- None.

## Docs updated
- None: no rule or field changed.
