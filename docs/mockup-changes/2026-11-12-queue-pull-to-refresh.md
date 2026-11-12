# The session page refreshes when pulled down, and when the tab comes back

Status: IN MOCK APP — PR #763
Date: 2026-11-12
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › pull down from the top (#ptr)
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-DETAILS, Q-PUBLIC-PARTICIPANTS, Q-PUBLIC-RESULTS
Artifact: none
Components: pull-to-refresh (new), public-refresh-bar
Supersedes: none
Superseded by: none

## What changed
- Before: the session page refreshed only from the **Refresh** button in the "Updated 7:42 PM · Refresh" bar. D-2026-11-09-04 already said the player "can pull down or tap Refresh" and that the page refreshes "when they come back to the tab", but the mockup had neither.
- After: pulling the page down from its top (touch) slides a pill from under the top bar: **Pull to refresh**, then **Release to refresh** past the arm point (the ring flips). Releasing runs the same refresh as the button: **Refreshing…**, then **Updated 7:42 PM** for a moment, and the pill slides away. Only the data refreshes, rendered in place. Coming back to the tab refreshes too.
- The 10 second lock is shared with the Refresh button: a full pull inside the lock shows **Refresh again in a few seconds** and nothing runs. Offline, a full pull shows **You're offline. Reconnect and try again.** A short pull, or a pull that starts while the page is scrolled, does nothing. Nothing happens while a sheet is open.
- Applies to the person who opened the session link (the same audience as the Refresh bar: visitor or signed-in Player). The Queue Master's preview of the page has no pull.

## Why
- Owner, November 12, 2026: "I want a scroll down to refresh page feature … or pull to refresh", after a sweep of which screens need it. D-2026-11-09-04 (owner, November 9, 2026): "The player can pull down or tap Refresh, at most once every 10 seconds, and it also refreshes when they come back to the tab."

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: pulling (pill follows the finger from above the bar), armed (ring flipped), refreshing (ring spins), done (accent text, 1.4 s), locked (grey, 1.6 s), offline (grey, 1.6 s). Reduced motion: no slide transitions, the ring turns slowly.
- Copy: Pull to refresh; Release to refresh; Refreshing…; Updated 7:42 PM; Refresh again in a few seconds; You're offline. Reconnect and try again.
- Tokens: none (pill uses `--surface`, `--border`, `--border-strong`, `--accent`, `--fg2`, `--shadow`)
- Known differences: none

## Reuse plan
- Reuses as is: `public-refresh-bar/` — unchanged; the pull shares its lock and copy
- Extends: none
- New: `pull-to-refresh/` — the wrapper with the gesture and the pill; nothing existing listens for a pull. Shared by the Player app and Admin logs below.
- Shares work with: 2026-11-12-player-pull-to-refresh.md, 2026-11-12-admin-pull-to-refresh.md

## Docs updated
- Business logic: none needed (D-2026-11-09-04 already states the rule)
- Database design: none needed (reads only)
- Screen docs: public-session.md — Refresh bar paragraph now covers the pull and the tab return

## Real app work
- Built in the same branch as this log (`claude/friendly-darwin-oiae5f`), not through a ticket: `pull-to-refresh` in `@rotra/ui` with stories and `.meta.ts`; `useThrottledRefresh` in `@rotra/data` (the public page's `useRefreshSession` now wraps it); `PublicSession` wrapped for every viewer of `/s/<slug>`. Merged through PR #763.
