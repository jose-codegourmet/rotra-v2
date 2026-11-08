# Preparation and level tabs become styled dropdown menus on phones

Status: IN PROGRESS — #498
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation (and live session settings) › tab row, and Roster and levels › level tabs
Screen ID: Q-PREPARE
Route: /queue/sessions/s-tonight/preparation?tab=roster
Components: roster-panel, preparation-roster, tab-menu, tabs, session-preparation

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

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Reuses `tab-menu/` from Q14.1 as is
- Builds on the `overflow-menu/` list pattern; extends `tabs/` with an opt-in prop
- Reused by Q13.4 for the level tabs
- Shares work with: `2026-11-08-queue-phone-header-more-options`, `2026-11-08-queue-roster-card-emphasis`, `2026-11-08-queue-roster-skill-mix-progress`, `2026-11-08-queue-roster-summary-one-box`, `2026-11-08-queue-roster-view-toggle-icons`, `2026-11-08-queue-session-qr-share-card`, `2026-11-08-queue-title-public-page-icon`

## Tickets
- Epic: #498 (Q13), #499 (Q14)
- #535 Q13.4 · Roster level tabs become a menu on phones
- #536 Q13.6 · Roster summary bar drives the level tabs on Preparation and Session settings
- #509 Q14.1 · TabMenu: tabs as a styled menu on phones
- #512 Q14.4 · Preparation header, phone More options and preparation tabs menu

## Q14 implementation verification (November 8, 2026)
- Q14 Preparation uses the phone menu. Verified keyboard selection, full count labels, menu dismissal, focus return and URL-backed tab changes.
- Q13 roster level-tab work belongs to #535/#536; this shared log stays IN PROGRESS until that work and full visual comparison are complete.
- Workspace lint, type-check and build ran at the end of the four-ticket list, per owner instruction.
