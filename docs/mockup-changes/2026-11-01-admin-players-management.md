# Players management overhaul

Status: NEW
Date: 2026-11-01
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Players
Screen ID: A-PLAYERS, A-PLAYER-DETAIL

## What changed
Count cards, filters, pagination, grid/list, quick-view drawer, game history, add/edit forms, archive/remove confirmations and row/bulk action designs replace the growing directory.

## Why
Approved decisions in #335–#346.

## Docs updated
Business logic: admin player-management README. Screen docs: admin players-requests. Database design: operational persistence stays deferred to F07; no migration in this epic.

## Real app work
Existing tickets #336–#346 implement these controls with shared components and mock data. Prototype demonstrates layout and copy; the app implements validation and state handling.
