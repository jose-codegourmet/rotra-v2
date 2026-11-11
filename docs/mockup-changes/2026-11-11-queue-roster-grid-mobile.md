# Roster and levels › Grid view on phones: two compact columns

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation › Roster and levels › Grid view
Route: /queue/sessions/s-tonight/preparation?tab=roster (Grid view, at 375 px)
Screen ID: Q-PREP (Roster and levels)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: roster-card, roster-grid
Supersedes: none
Superseded by: none

## What changed
- Before: on screens up to 640 px the grid collapsed to one column of wide cards, so Grid view looked like List view.
- After: on screens up to 640 px the grid is two columns of compact cards: the picture (56 px) centred on top, the name under it, the level box, then the chips and buttons centred; the remove × sits in the card's top-right corner. Nothing changes from 641 px up.

## Why
- Owner comment on the Queue artifact, November 11, 2026: "grid view doesn't feel like grid view for mobile".

## Like for like
- Compare at: 375 px (two columns) and 1280 px (unchanged), dark and light.
- States: present / not present, needs a level (coloured level box), paid / not paid, long names wrapping, remove × on the corner.
- Copy: none changed.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: roster-card
- Extends: roster-grid (phone layout)
- New: none
- Shares work with: none

## Docs updated
- Business logic: none needed.
- Database design: none needed.
- Screen docs: `docs/screens/product/modules/queue/session-setup.md` › Roster views (Grid view is two compact columns at 640 px and narrower).

## Real app work
- `@rotra/ui` RosterGrid: two-column compact variant under 640 px.
