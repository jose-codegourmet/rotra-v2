# Roster grid card puts presence and level first

Status: IN MOCK APP — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › Roster and levels tab › Grid view
Screen ID: Q-PREPARE (roster tab, Grid)
Route: /queue/sessions/s-tonight/preparation?tab=roster
Components: roster-card, segmented-control, roster-panel, preparation-roster

## What changed
- Before: every item on the card had the same weight (identity chip, suggestion, level select, Present
  switch, Paid in one stack).
- After, first level: a full-width **Present** band (accent tint when present, with the switch) and a
  **level** block tinted and outlined in the skill group's color (blue, yellow, red) holding the level
  select and suggestion indicator.
- After, second level: one small muted line with the identity chip (Registered, Guest, …), Paid / Not
  paid and “Suggestion: LEVEL”. Paid no longer turns green.
- The List view rows are unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: the emphasis is present or not and skill level;
  registered and paid are second-level information.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Roster views, Grid description

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `roster-card/` and `segmented-control/` (icon option, reused by A05.1)
- Reuses `switch/`, `level-select/`, `identity-chip/` as is
- Shares work with: `2026-11-08-queue-phone-tabs-dropdown`, `2026-11-08-queue-roster-skill-mix-progress`, `2026-11-08-queue-roster-summary-one-box`, `2026-11-08-queue-roster-view-toggle-icons`

## Tickets
- Epic: #498 (Q13)
- #507 Q13.3 · RosterCard leads with presence and level; icon List | Grid toggle
- #536 Q13.6 · Roster summary bar drives the level tabs on Preparation and Session settings
