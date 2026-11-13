# Roster level: a coloured select menu

Status: NEW
Date: 2026-11-13
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › lvMenu, rvLevel, ACT.lvMenuToggle / lvMenuPick; `.lvm*` styles
Route: /queue/sessions/<id>/preparation?tab=roster (list and grid)
Screen ID: Q-PREP roster
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: level-select-menu (new; replaces the native select in the roster)
Supersedes: the native level select on roster rows and cards
Superseded by: none

## What changed
- Before: a browser select (“Choose a level…”, grouped options) inside a band-tinted box.
- After: a select-menu button filled in the level's band colour (Beginner blue, Intermediate yellow, Advanced red; dashed and muted when no level), a coloured dot, the level name and a chevron. It opens a menu with the three bands as tinted groups (band name with its dot) of three buttons each (Low · Mid · High); the current level is filled in its colour with a check. Picking closes the menu and saves the level (same commit and toast as before); clicking outside or Esc closes it; focus returns to the button. Accessible: button with aria-haspopup="listbox" and aria-expanded; options role="option" with aria-selected.
- Unchanged: “Fixed after start” once the session is live; the level-vs-suggestion line under it; other places that use the native select.

## Why
- Owner artifact comment, November 13, 2026: “I want this to be select where the bg is just updated to what level they are · instead of showing a generic select option show a select menu”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each band, no level, menu open near the bottom of the page, list and grid view.
- Copy: “Choose a level…”, band names, Low / Mid / High.
- Tokens: --lv-beg, --lv-int, --lv-adv.
- Known differences: none

## Reuse plan
- New: level-select-menu; use it wherever a session level is picked (Add player, join requests, waitlist) in a later pass.
