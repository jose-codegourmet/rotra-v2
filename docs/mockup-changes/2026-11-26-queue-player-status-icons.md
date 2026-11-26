# Queue app: player status pill uses icons; Players card footer holds edit and Present

Status: IN REAL MODE — #1132
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `ST_ICO`, `stPill`, `statusPill`, Players cards (`.pc3-foot`, `.pc3-acts`, `.pc3-edit`), `.st-legend`
Route: /sessions/[id] (live console › Players, Main Queue faces)
Screen ID: Q-CONSOLE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: StatusPill, LivePlayerCard
Supersedes: none
Superseded by: none

## What changed
- The status pill is an icon plus the time: hourglass (free, waiting), list (in queue), shuttlecock (playing), clock
  (“Ready”, getting ready on a court), moon (“Away”). Warning at 10 min and error at 16 min stay.
- The full words move to the hover title and the screen-reader label.
- A **Status** legend strip sits above the Players cards: bordered, each key is the real coloured pill with its words in
  normal text (owner: “the legends dont look visible”).
- The Players card's Edit player pencil leaves the name row and becomes a 28 px accent circle sitting on the card's
  top-right corner (over the border, like the pick-order badge on the left), so the name uses
  almost the full card width (“Ysa Fernandez”, not “Ysa Ferna…”). The footer is the status pill and the Present switch.
- The Main Queue faces use the same pill, so they get the icons too.
- The Players Show filter gains **In queue · N** (free players in a waiting Main Queue match) and **Playing · N**
  (players on a court, getting ready or playing), after Available.

## Why
- Owner chat, November 26, 2026, on a Players card screenshot: “can we solutionize the layout for this, maybe icons for
  in queue, playing, waiting”; artifact comment the same day on the Show filter: “add in queue and playing”, and “the edit icon should be in the top right corner of the box”, then “make this as a circle in the top right border, the
  button doesnt feel obvious”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light: Players tab (Everyone filter), Main Queue cards.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Players card)
- docs/screens/product/modules/queue/match-queue.md (status pill)
