# Give all three prototypes app routes and browser history

Status: NEW
Date: 2026-10-31
App: queue, player, admin (shared prototype infrastructure)
Mockup: app/mocksups-app/{queue,player,admin}-app/rotra-{queue,player,admin}.html
Screen ID: existing prototype surfaces; no new product screens

## What changed
- The launcher opens `/queue`, `/player`, and `/admin` instead of HTML file URLs.
- Existing screens use the actual apps' route paths beneath each prefix. Navigation updates the
  address bar, direct links and refresh select the requested screen, and Back/Forward navigate.
- Tabs have query parameters. Queue public links open the local guest prototype. Old HTML URLs redirect.
- Missing records show a navigation fallback; Player/Admin mock sign-in preserves the return route.
- Browser history never restores data snapshots or replays finalization. Browser Back/page exit warns
  about unsaved Player profile and Admin ranking drafts.
- Canonical visual layouts, fixtures, and standalone product HTML mode are retained.

## Why
- The owner requested a separate prototype app that feels like an app with real routes, using the
  existing product apps as the route reference, and authorized branch → PR → merge to main.

## Docs updated
- Business logic: none needed — no domain, auth, money, ranking, or result rules changed.
- Database design: none needed — browser-local prototype infrastructure only.
- Screen docs: none needed — layouts and product controls unchanged.
- Architecture, root README, AGENTS command description, and prototype README explain the runtime,
  route map, packaging, and demo limitations.

## Real app work
- None required. This change mirrors routes already in the actual apps; it does not request new
  product features. Recovery/finalization direct links select an existing safe session view because
  the prototype's recovery scenarios remain in its demo controls.
