# Queue app: Session link and the join switches are separate boxes

Status: IN MOCK APP — #1071
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `linkCard()`
Route: /queue/sessions/s-tonight?tab=settings (and Q-PREPARE before Start)
Screen ID: Q-CONSOLE, Q-PREPARE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: card (reuse), switch (reuse)
Supersedes: none
Superseded by: none

## What changed
- Before: one Session link card holding the link, its buttons and the two join switches.
- After: two cards side by side (stacked on phones):
  - **Session link**: the help line, the link with **Copy link**, **Open as a guest**, **Preview public page**.
  - **Who can join**: “How people get a slot from the session link.”, then **Accept join requests** and **Always require a
    request** with their switches and lines, unchanged.
- The same split shows on the preparation page, where this card is used too.

## Why
- Owner artifact comment, November 19, 2026, on the Session link card: “session link different box, the switches different
  box”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; on the Settings tab and before Start.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table, Settings)
