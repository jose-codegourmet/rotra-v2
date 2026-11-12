# The request inboxes refresh when pulled down

Status: IN MOCK APP — PR #763
Date: 2026-11-12
App: admin
Mockup: apps/mockup/admin-app/rotra-admin.html › Requests › Contact changes, Club names, Password resets › pull down from the top (#ptr)
Route: /admin/requests/contact-changes, /admin/requests/club-names, /admin/requests/password-resets
Screen ID: A-CONTACT-REQUESTS, A-PASSWORD-REQUESTS (Club names has no screen ID; see access-navigation.md)
Artifact: none
Components: pull-to-refresh (shared with the Queue log), data-table, list-row, password-reset-requests
Supersedes: none
Superseded by: none

## What changed
- Before: the three inboxes under Requests loaded once; a new request showed only after leaving and coming back.
- After: pulling the page down from its top (touch) refreshes the list the same way as the session page (Queue log of the same date): **Pull to refresh** → **Release to refresh** → **Refreshing…** → **Updated 7:42 PM**. Once every 10 seconds; inside the lock a full pull shows **Refresh again in a few seconds**; offline it shows **You're offline. Reconnect and try again.** Coming back to the tab refreshes too. Nothing happens while a sheet is open.
- Scope: Contact changes, Club names and Password resets only. Club and player detail, Sales, Players and the configuration pages are unchanged: they hold drafts or are edited in place, and a stale configuration is handled by the versioned-save conflict rule, not by a refresh.

## Why
- Owner, November 12, 2026: "do a complete implementation" after the sweep listed the Admin inboxes as the lists the platform owner checks on a phone. Same rule as D-2026-11-09-04 (once every 10 seconds, data only, no polling).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: pulling, armed, refreshing, done, locked, offline (same as the Queue log). Reduced motion: no slide transitions, the ring turns slowly.
- Copy: Pull to refresh; Release to refresh; Refreshing…; Updated 7:42 PM; Refresh again in a few seconds; You're offline. Reconnect and try again.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `pull-to-refresh/` — from the Queue log of the same date; the three list components unchanged
- Extends: none
- New: none
- Shares work with: 2026-11-12-queue-pull-to-refresh.md, 2026-11-12-player-pull-to-refresh.md

## Docs updated
- Business logic: none needed (reads only)
- Database design: none needed
- Screen docs: players-requests.md (A-CONTACT-REQUESTS, A-PASSWORD-REQUESTS), access-navigation.md (Requests)

## Real app work
- Built in the same branch as this log (`claude/friendly-darwin-oiae5f`), not through a ticket: `ContactRequestsPage`, `ClubNameRequests` and `PasswordResetRequestsPage` wrapped in `PullToRefresh` with `useThrottledRefresh` (`refreshOnReturn`). Merged through PR #763.
