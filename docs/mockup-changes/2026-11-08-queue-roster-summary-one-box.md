# Roster tab: slots and skill mix in one box, one bar

Status: TICKETED — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Roster and levels tab › header summary
Screen ID: Q-PREPARE (roster tab)
Supersedes: 2026-11-08-queue-roster-skill-mix-progress.md
Superseded by: none
Route: /queue/sessions/s-tonight/preparation?tab=roster
Components: slot-meter, preparation-roster

## What changed
- Before: two stacked blocks, a slots meter with its own progress bar and a Skill mix bar below it.
- After: one box with the slots line (“24/24 slots · …”) over a single bar that spans the slot budget.
  Colored segments are the confirmed players by skill group (blue, yellow, red, grey for no level); the
  grey remainder is open slots. Hover or focus a segment for its count (“Beginner: 4 players”,
  “10 open slots”). The amber warning text when the budget is full is kept.
- Pressing a player segment filters the list like that level's tab (Advanced, Intermediate, Beginner, No
  level); the chosen segment stays full and the rest dim; pressing it again returns to All (owner comment,
  same day: clicking the bar should trigger the level tabs). The open-slots segment does nothing.
- The public page's Skill mix bar (in the Want to play? card) is unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: this can be one box; there are so many progress bars.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs:
  - docs/screens/product/modules/queue/session-setup.md — Roster and levels (tab) row
  - docs/screens/product/modules/queue/players-roster.md — Skill mix paragraph

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `slot-meter/` with skill segments; reuses the segment math and tooltip from `skill-distribution-bar/` (import, do not copy)
- Shares work with: `2026-11-08-queue-phone-tabs-dropdown`, `2026-11-08-queue-roster-card-emphasis`, `2026-11-08-queue-roster-skill-mix-progress`, `2026-11-08-queue-roster-view-toggle-icons`

## Tickets
- Epic: #498 (Q13)
- #506 Q13.2 · Roster summary: slots and skill mix in one bar, pressable segments
- #536 Q13.6 · Roster summary bar drives the level tabs on Preparation and Session settings
