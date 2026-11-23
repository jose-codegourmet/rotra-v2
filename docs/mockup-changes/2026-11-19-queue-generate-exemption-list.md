# Queue app: Generate Queue has an exemption list

Status: TICKETED — #1061
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `exemptCard()`, `exemptOf()`, `generateDrafts()` pool, `CHANGE.exemptAdd`, `exemptRemove`
Route: /queue/sessions/s-tonight?tab=generate
Screen ID: Q-AUTO
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: card, select, player chip with remove (new, small)
Supersedes: none
Superseded by: none

## What changed
- A new card on Generate Queue, under the heading (after Bagging pairs when it's on): **Exemption list · N**.
  - **Add a player…**: a menu of roster players not on the list.
  - Each exempt player is a chip (picture, short name, × to take them off). Empty: “No one is exempt.”
  - Help line: “Generate Queue leaves these players out. They stay on the roster, and you can still put them in a match
    yourself.”
- Generating (any strategy) leaves exempt players out of every draft. Add match, Make match and Suggest still allow them.
- The list belongs to the session. Toasts “NAME added to the exemption list”, “NAME taken off the exemption list”.

## Why
- Owner artifact comment, November 19, 2026, on Generate Queue: “also add exemption list, this excludes certain players
  when generating matches”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; empty and with several players; generating with exempt players.

## Open
- Whether Suggest and Auto Queue should also respect the list (the mockup applies it to Generate Queue only).
- Whether the list should carry over to the club's next session.

## Docs updated
- docs/screens/product/modules/queue/match-queue.md (Q-AUTO)
- docs/business_logic/product/queue/modules/queueing/README.md (Exemption list)
