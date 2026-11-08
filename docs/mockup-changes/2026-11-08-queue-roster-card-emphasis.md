# Roster grid card puts presence and level first

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation › Roster and levels tab › Grid view
Screen ID: Q-PREPARE (roster tab, Grid)

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
