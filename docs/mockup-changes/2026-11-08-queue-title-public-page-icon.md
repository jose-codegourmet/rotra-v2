# Preparation title gets an "Open public page" icon button

Status: IN PROGRESS — #499
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation and session settings › header
Screen ID: Q-PREPARE
Route: /queue/sessions/s-tonight/preparation
Components: page-header, more-options-sheet, session-preparation

## What changed
- Before: a “Preview public page” text button sat in the header action row, away from the title.
- After: an external-link icon button (“Open public page”, same preview route) sits right after the session
  title, because the title is what the public page shows. The text button leaves the header row. The
  Session link card in Overview keeps its “Preview public page” button.

## Why
- Owner comment on the artifact, November 8, 2026: the title itself is the public page, so add a
  link-to-page icon button next to it.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs:
  - docs/screens/product/modules/queue/session-setup.md — header description
  - docs/screens/product/modules/queue/public-session.md — how the operator reaches the page

## Like for like
- Compare at: 375 px and 1280 px, dark and light, beside the mockup route above.
- States and copy: exactly as listed under What changed; each ticket repeats them as acceptance criteria.
- Known differences: none

## Reuse plan
- Extends `page-header/` (slot only); reuses `icon-button/`, `sheet/`, `button/` as is; new `more-options-sheet/`
- Shares work with: `2026-11-08-queue-phone-header-more-options`, `2026-11-08-queue-phone-tabs-dropdown`, `2026-11-08-queue-session-qr-share-card`

## Tickets
- Epic: #499 (Q14)
- #510 Q14.2 · Header: Open public page icon beside the title; More options dialog on phones
- #512 Q14.4 · Preparation header, phone More options and preparation tabs menu
