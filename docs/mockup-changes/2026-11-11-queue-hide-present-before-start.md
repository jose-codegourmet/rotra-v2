# Preparation roster: no Present switches until the session has started

Status: IN MOCK APP — #704
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session Preparation › Roster and levels (`rvRow`, `rvCard`)
Route: /queue/sessions/s-tonight/preparation?tab=roster
Screen ID: Q-PREPARE (Roster and levels)
Artifact: none
Components: roster-row, roster-card, roster-panel
Supersedes: none
Superseded by: none

## What changed
- Before: before Start session every roster row and card showed a Present / Not present switch.
- After: before Start session rows and cards show no Present text or switch (remove × stays). Once the session has started, presence shows as before (“Present / Away” text). **Mark all present** and **Mark all absent** are hidden with the switches (Add player is then alone and spans both phone columns). Presence data is untouched.

## Why
- Jose, November 11, 2026: “only when session has started the “present” switches will show, since this is a preparation it should not show these switches”.
- Decisions: gate on session status, not surface (hidden before start, shown on any roster after start); keep existing presence data.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: before start, list and grid (no presence); after start, list and grid (Present / Away text); self check-in mark unchanged; header actions before start: Add player only (full width on a phone).
- Copy: none new.
- Tokens: none.
- Known differences: none.

## Reuse plan
- Reuses as is: `roster-panel/` layout.
- Extends: `roster-row/`, `roster-card/`, `roster-panel/` — `showPresence` prop (default true).
- New: none.
- Shares work with: 2026-11-08-queue-roster-card-emphasis

## Docs updated
- Business logic: business_logic/product/queue/modules/players/README.md — owner decision under Presence.
- Database design: none needed.
- Screen docs: screens/product/modules/queue/session-setup.md, players-roster.md.

## Real app work
- Built in the same change: `RosterRow`, `RosterCard`, `RosterPanel` gain `showPresence`; `PreparationRoster` passes `session.state !== 'prepared'`. Stories `BeforeStart` added.
