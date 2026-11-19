# Queue app: compact public Queue tiles with stacked players and a View match dialog

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › public Queue `tile` in `viewPublic`, `.pqc` styles, `SHEETS.pubQueueMatch`, `ACT.pubQueueMatch`
Route: /queue/s/<slug> (Details tab, signed in, live session)
Screen ID: Q-PUBLIC
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: public queue tile, queue match dialog (new)
Supersedes: none
Superseded by: none

## What changed
- Before: each Queue tile laid the players side by side, as 36 px pictures with the names under them.
- After:
  - **Tile:** each team is a column of compact rows: a 28 px picture with its level ring, then the first name. “VS”
    sits between the teams, and the tile is tighter.
  - **Eye button:** at the top right (“View match”), it opens a dialog:
    - title “Queue #N · <match label>”;
    - the match drawn on a court, the same as Courts now (two courts tall for more than six players);
    - “Next on a court.” or “Waiting in queue.”, then “The Queue Master can still change it.”;
    - **Close**.

## Why
- Owner artifact comment, November 19, 2026, on the public page's Queue: “can we stack the players and make it a bit
  more compact and then put an eye icon on the top right to view the match in a dialog”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: Next tile, singles, doubles, 1v2 and 5v5 tiles, masked names, the dialog for a small and a big match.

## Copy
- “View match” (eye label) · “Queue #N · <match label>” · “Next on a court.” · “Waiting in queue.” · “The Queue
  Master can still change it.” · “This match has left the queue.”

## Open
- None.

## Docs updated
- screens/product/modules/queue/public-session.md (compact Queue tiles and the View match dialog).
