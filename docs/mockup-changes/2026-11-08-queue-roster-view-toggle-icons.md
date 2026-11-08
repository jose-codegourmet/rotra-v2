# Roster List | Grid toggle uses icons

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Roster and levels › view toggle
Screen ID: Q-PREPARE (roster tab)

## What changed
- Before: a segmented control with the words “List” and “Grid”.
- After: the same control with two icon buttons, a lines icon for List and a four-squares icon for Grid.
  They keep the accessible names “List view” and “Grid view” and show the name as a hover title. Behavior
  and the remembered choice are unchanged.
- Other buttons in the roster header (Mark all present, Mark all absent, Add player) stay as text; the
  owner's comment sat on the whole section, so this is the part judged best as icons.

## Why
- Owner comment on the artifact, November 8, 2026: this would be better off as icons.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Roster views, List | Grid toggle
