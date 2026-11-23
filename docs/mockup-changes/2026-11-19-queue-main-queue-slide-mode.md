# Queue app: Main Queue cards slide sideways by default, with a grid mode switch

Status: TICKETED — #1061
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `queuePane()`, `setupQueueSlide()`, actions `qView`, `qsStep`
Route: /queue/sessions/s-tonight?tab=queue
Screen ID: Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: Main Queue card list (carousel, new), icon view switch (new), icon buttons (reuse)
Supersedes: none
Superseded by: none

## What changed
- **Slide mode (default):** the waiting matches are one row in queue order that scrolls sideways and snaps per card.
  Cards are 300 px (86% of the width on phones). The right edge fades out with a gradient mask while more cards are to
  the right; the left edge fades while cards are to the left; neither fades at the ends.
- Above the cards: “N waiting”; on the right, previous and next arrow buttons (slide mode only) and a two-icon switch,
  **Slide mode** · **Grid mode** (icons, with tooltips and screen-reader labels).
- **Grid mode:** the snake grid as before.
- The help line follows the mode. Dragging a card by ⠿ still reorders in both modes. The scroll position survives
  updates; the mode stays on this device.

## Why
- Owner artifact comment, November 19, 2026, on the Main Queue cards: “this should be a embla carousel”, right and left
  sides gradient-masked when items exist there, a “grid mode” switch at the top right, slide mode by default, icons.

## Like for like
- Compare at: 375 px and 1280 px, dark and light: at the start (right fade only), in the middle (both), at the end (left
  only), one card (no fade); grid mode; reordering by drag in slide mode; keyboard focus on the scroller and the switch.

## Open
- The owner named **Embla**. The mockup imitates it with native scroll snapping (no library). Using Embla in the real app
  is a new dependency, which needs a decision first (AGENTS rule 11). Native CSS scroll snap would need none.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (Slide mode and grid mode)
