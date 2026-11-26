# Queue app: in the match dialogs, a player's card swaps the player and the picture opens the profile

Status: IN MOCK APP — #1042
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `faceTeam()` (card option), sheets `match` (Q-ACTIVE-MATCH) and `onCourt` (Q-ON-COURT), action `replaceFor`
Route: /queue/sessions/s-tonight (Courts tab › Open match)
Screen ID: Q-ACTIVE-MATCH, Q-ON-COURT
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: dialog player card (split: picture button + card button), swap icon (new)
Supersedes: none
Superseded by: none

## What changed
- **Playing (Q-ACTIVE-MATCH):** before, the whole card opened Substitute or Replace and the profile was only reachable
  from there. Now the card opens **Change NAME?** (Substitute or Replace); the picture opens the profile.
- **Getting ready (Q-ON-COURT):** before, the whole card opened the profile. Now the card opens **Replace player** for that
  player; the picture opens the profile. Dragging onto the other team still switches sides.
- Each card shows a swap icon on the right (accent on hover); the picture gets an accent ring on hover.
- Help lines: “Tap a player's card to substitute or replace them, or their picture to see their profile.” and “Tap a
  player's card to replace them, or their picture to see their profile.”
- Other dialogs (Put on court, Suggested match, results) are unchanged: the card still opens the profile there.

## Why
- Owner artifact comment, November 19, 2026, on the match dialog: “clicking on cards here means swapping players but
  clicking on avatar means opening profile dialog”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; Playing and Getting ready; tap card vs picture; keyboard focus on both.

## Docs updated
- docs/screens/product/modules/queue/match-control.md (Q-ON-COURT, Q-ACTIVE-MATCH)
