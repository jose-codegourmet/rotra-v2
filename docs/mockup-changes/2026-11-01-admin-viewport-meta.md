# Admin prototype: add the viewport meta

Status: NEW
Date: 2026-11-01
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › document head

## What changed
- Added `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`, replacing the ineffective `claude:viewport-fit-sides` meta.
- Phones now lay the prototype out at their real width, so the existing 900/760/640/560/480 breakpoints apply. `apps/mockup/build.mjs` now fails if a prototype lacks a viewport meta.

## Why
- Without it phones used a 980 px layout viewport and showed a shrunken desktop layout, unlike the real app (issue #327).

## Docs updated
- None: no behavior, copy, data or flow changed.

## Real app work
- None: the real app already sends the default Next.js viewport meta and behaves this way.
