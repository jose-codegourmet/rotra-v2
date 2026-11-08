# Roster List | Grid toggle uses icons

Status: IN PROGRESS — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Roster and levels › view toggle
Screen ID: Q-PREPARE (roster tab)
Route: /queue/sessions/s-tonight/preparation?tab=roster
Components: roster-card, segmented-control, roster-panel, preparation-roster

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

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `roster-card/` and `segmented-control/` (icon option, reused by A05.1)
- Reuses `switch/`, `level-select/`, `identity-chip/` as is
- Shares work with: `2026-11-08-queue-phone-tabs-dropdown`, `2026-11-08-queue-roster-card-emphasis`, `2026-11-08-queue-roster-skill-mix-progress`, `2026-11-08-queue-roster-summary-one-box`

## Tickets
- Epic: #498 (Q13)
- #507 Q13.3 · RosterCard leads with presence and level; icon List | Grid toggle
- #536 Q13.6 · Roster summary bar drives the level tabs on Preparation and Session settings
