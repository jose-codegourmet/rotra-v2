# Queue app: the Players picker sits under the Main Queue

Status: TICKETED — #1060
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › console `pane === 'queue'` (`queuePane()` then `playersPane()`)
Route: /queue/sessions/s-tonight?tab=queue
Screen ID: Q-CONSOLE, Q-QUEUE
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: Players pane (reuse as is)
Supersedes: none
Superseded by: none

## What changed
- The Main Queue tab now shows, under the queue, the whole Players section from the Players tab: the header with Set
  games for all… and Add late player, the Show filter and sort, the player cards, the waitlist, and picking players to
  Make match. A divider separates it from the queue.
- Picking players and confirming Make match adds the match to the end of the queue right above, without leaving the tab.
- The Players tab is unchanged.

## Why
- Owner, November 19, 2026, in the session, with screenshots of the Players tab and the Main Queue: “put this below the
  main queue so it is easy to make matches while looking at the main queue”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; picking players under the queue and making a match; slide and grid
  mode above it.

## Open
- Whether the Players tab is still needed now that the picker is under the Main Queue.

## Docs updated
- docs/screens/product/modules/queue/session-console.md (Views table)
