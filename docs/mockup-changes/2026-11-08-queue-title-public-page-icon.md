# Preparation title gets an "Open public page" icon button

Status: NEW
Date: 2026-11-08
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Session preparation and session settings › header
Screen ID: Q-PREPARE

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
