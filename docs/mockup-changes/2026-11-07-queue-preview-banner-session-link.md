# Public page preview banner shows the session link to share, with Copy link

Status: ALREADY A TICKET — #469
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public page (viewPublic, operator preview banner)
Screen ID: Q-PUBLIC-DETAILS

## What changed
- **Preview banner:** keeps “Public page preview. What anyone with the session link sees, no sign-in needed.” with **Back to Queue app**, and adds a second line: “Share this link, not this page's address:” + the session link (`/s/<slug>`) + **Copy link** (toast “Session link copied”). Before: the banner had no link, so organizers copied the preview address from the address bar.
- The prototype-only “Guest view (prototype)” banner is unchanged.

## Why
- #469: an organizer shared the preview address `/sessions/<id>/public-page`, which is an operator route, instead of the session link. The banner now names the address to share.

## Docs updated
- Business logic: none needed
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/public-session.md — banner's link line, and the preview route is owning-club only (others are redirected to `/s/<slug>`); docs/screens/product/navigation.md — the route boundary exception

## Real app work
- Done in #469: PublicPreviewBanner takes `sessionLink` + `onCopyLink`; PublicPagePreview passes origin + `/s/<slug>`; proxy.ts lets the preview path through and its page redirects anyone but the owning club to `/s/<slug>`.
