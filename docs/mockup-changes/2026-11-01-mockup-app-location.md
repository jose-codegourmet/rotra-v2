# Move the canonical mockups into apps/mockup

Status: MOCKUP ONLY — repository and hosting move, no UI change
Date: 2026-11-01
App: queue | player | admin
Mockup: apps/mockup/ › routed prototype launcher and all three HTML prototypes

## What changed
- Moved `app/mocksups-app` to `apps/mockup` at the product owner's request.
- Added static build output and routing for `mockup.rotra.club` in the existing Vercel Services project.
- Updated current prototype references and production deployment instructions. The HTML layouts and product rules are unchanged.

## Why
- Keep every deployable app under `apps/` and deploy the four requested subdomains together.

## Docs updated
- Business logic and database design: prototype-reference paths updated; no rules or schema changes.
- Screen docs and component metadata: canonical-reference paths updated; no UI changes.
- Architecture, AGENTS.md and README: workspace location and deployment setup updated.

## Real app work
- None: this is the directly requested repository/hosting migration, without a new Queue, Player Information or Admin UI change.
