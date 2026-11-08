# Preparation and level tabs become styled dropdown menus on phones

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation (and live session settings) › tab row, and Roster and levels › level tabs
Screen ID: Q-PREPARE

## What changed
- Before: at 640 px and narrower the tabs were squeezed into an even grid (preparation tabs) or a sideways
  scrolling row (level tabs).
- After: on a phone each row is one full-width menu button (current tab + chevron) that opens a styled list
  with the same entries, their count chips and a check on the current one (“Roster and levels · 14/24”,
  “Advanced · 4”). Picking one switches the tab and closes the list. It is a custom menu, not the browser’s
  plain select box. Wider screens are unchanged.

## Why
- Owner comment on the artifact, November 8, 2026: for mobile this should be a dropdown list; a later comment said the plain select field felt cheap, so it is a styled menu. The comment
  sat on the whole page, so the owner may have meant only one of the two rows; both were converted.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Tabs row
