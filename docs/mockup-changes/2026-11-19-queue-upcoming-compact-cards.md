# Queue app: the Courts tab's upcoming queued matches use compact cards

Status: NEW
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `upcomingPane()`, `queueCard(…, compact)`
Route: /queue/sessions/s-tonight (Courts tab)
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: queue match card, compact variant (new): overlapping avatar stack with level rings
Supersedes: none
Superseded by: none

## What changed
- The cards under **Upcoming queued matches** on the Courts tab are compact:
  - no wait times under the players;
  - each team is a stack of overlapping pictures (34 px) with the level ring (Beginner, Intermediate, Advanced; grey with
    no level), and the short names on one line beside it (“Rafa, Migo, Pau”), then VS and the other team;
  - the head (position, category and format, origin, drag handle), status line and buttons stay; Ready for court stays.
- Tiles are 300 px or more here (the Main Queue keeps 450 px), so more fit in the row.
- Pictures still open the profile; dragging one onto the other team still switches sides.

## Why
- Owner artifact comment, November 19, 2026, on Upcoming queued matches: “make the cards here a bit more compact, remove
  the time and feel free to stack the player avatars but also add the skill borders”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; doubles, singles, 5v5; a ready card and an attention card.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Upcoming queued matches)
