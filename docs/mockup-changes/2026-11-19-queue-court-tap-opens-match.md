# Queue app: tapping a busy court's drawing opens the match

Status: IN MOCK APP — #1042
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtsPane()` (`.pitch.open-pitch`)
Route: /queue/sessions/s-tonight (Courts tab)
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: court card (reuse)
Supersedes: none
Superseded by: none

## What changed
- On a Getting ready or Playing court, tapping the badminton court drawing (anywhere but a face) opens the same dialog
  as **Open match** (Q-ON-COURT or Q-ACTIVE-MATCH). The drawing shows a pointer and brightens slightly on hover, with a
  “Open match” tooltip.
- Faces still open the player's profile. The **Open match** button stays for keyboard and screen-reader use.
- Free courts are unchanged.

## Why
- Owner artifact comment, November 19, 2026, on a court card: “clicking in the badminton court bg opens the ‘open match’
  dialog”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; a Getting ready court, a Playing court, a merged two-court match; tap
  on the court versus on a face.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (court card states)
