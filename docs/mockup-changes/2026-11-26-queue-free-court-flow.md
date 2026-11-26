# Queue app: free court flow (pick or generate), Suggested match rework, stacked dialogs go back

Status: TICKETED — #1118
Date: 2026-11-26
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `courtsPane` (`.free-pitch`), SHEETS `freeCourt`, `chooseMatch`, `suggest`, `sgPick`, `fillInfo`; `closeSheet`, `setupChooseSlider`, actions `openFreeCourt`, `reshuffleSuggest`, `sgReplace`, `sgChoose`, `sheetBack`
Route: /sessions/[id] (live, Courts)
Screen ID: Q-CONSOLE (court cards), Q-COURTS dialogs
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: free court card, Court N is free (new), Put a match on Court N, Suggested match, Replace player (new), How courts get matches (new)
Supersedes: none
Superseded by: none

## What changed
- Auto Queue is one switch with an ⓘ that opens How courts get matches (two cards with small drawings).
- A free court's picture (a dashed + disc, FREE, Tap to fill) opens **Court N is free**: Pick from the queue · Generate a match.
- **Put a match on Court N** shows the Main Queue cards in an Embla carousel with side gradient masks; each card's
  **Put on Court N** places it.
- **Suggested match**: Reshuffle (with a deal-in animation), tap a player to **Replace** them individually; footer Back ·
  Add to queue (Skip suggestion and Edit then add removed).
- Stacked dialogs: ×, Escape, the scrim and Back return to the previous dialog one level at a time.

## Why
- Owner artifact comments and chat, November 26, 2026 (quoted in the screen doc and the code comments).

## Like for like
- Compare at: 375 px and 1280 px, dark and light. Flows: free court › pick › × › × ; free court › generate › replace › × × ×.

## Docs updated
- screens/product/modules/queue/session-console.md; screens/product/experience-contract.md (stacked dialogs).
