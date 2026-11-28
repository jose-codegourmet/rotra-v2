# Queue Add player › Saved players: every word matches, 3 rows then Show more

Status: MOCKUP ONLY — the real app already behaves this way (PR #1165); this log brings the mockup up to it
Date: 2026-11-28
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Add player sheet › Saved players tab
Route: preparation › Roster › Add player; live console › Players › Add player
Screen ID: Queue Add player (players-roster)
Artifact: none
Components: add-player-sheet
Supersedes: none
Superseded by: none

## What changed
- Search: before, the whole typed text had to appear in one field. Now every word typed must appear in the full name, nickname, club nickname or RTR ID, so "ana sm" and "smith ana" both find Ana Smith.
- List: before, every match was listed. Now 3 rows show, then **Show more · N left** adds 3 more. A new search or a filter change starts again at 3.

## Why
- Sync of the mockup with the real app (owner, November 28, 2026: "if mockapp is behind the real app, mock app should be updated"). The real app changed in PR #1165 (November 27, 2026) without a mockup change.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: fewer than 4 matches (no button), more than 3 (button), after Show more, a new search resets to 3, filters reset to 3.
- Copy: "Show more · N left".
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses: the existing `AddPlayerSheet` small button. New: none.

## Docs updated
- Screen: `docs/screens/product/modules/queue/players-roster.md` (Saved players row). Business logic and database: none (search and paging only).

## Real app work
- None: `AddPlayerSheet` already does this since PR #1165.
