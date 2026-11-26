# Queue app: match dialog player cards show the level as the picture's ring, not as text

Status: IN MOCK APP — #1045
Date: 2026-11-19
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `faceTeam()` (`.sg-p`)
Route: /queue/sessions/s-tonight (Open match, Put on court, Suggested match)
Screen ID: Q-ACTIVE-MATCH, Q-ON-COURT, Q-DISPATCH, Q-SUGGEST
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: dialog player card (reuse the level ring from the Players cards)
Supersedes: none
Superseded by: none

## What changed
- Before: each player card in the match dialogs had three lines: name, level (“Intermediate Mid”), games.
- After: name and games only. The picture has a 3 px ring in the level band colour (Beginner, Intermediate, Advanced;
  grey with no level), the same ring as the live Players cards. Hovering the card names the level; the card's
  screen-reader label still includes it.
- Applies to every dialog that uses these cards: Getting ready, Playing, Put on court, Suggested match, and the others
  built from the same card.

## Why
- Owner artifact comment, November 19, 2026, on the match dialog: remove “Intermediate Mid” and use the border
  indicators in the avatar to save space.

## Like for like
- Compare at: 375 px and 1280 px, dark and light; each band and no level.

## Docs updated
- docs/screens/product/modules/queue/match-control.md
