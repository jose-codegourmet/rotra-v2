# The leaderboard, a club's page and the own profile refresh when pulled down

Status: NEW
Date: 2026-11-12
App: player
Mockup: apps/mockup/player-app/rotra-player.html › Leaderboard, Club page, Own profile (My sessions) › pull down from the top (#ptr)
Route: /player, /player/clubs/c1, /player/players/u1
Screen ID: P-LEADERBOARD, P-CLUB-PAGE, P-OWN-PROFILE
Artifact: none
Components: pull-to-refresh (shared with the Queue log), leaderboard-list, club-next-up-card, club-calendar, my-sessions-card
Supersedes: none
Superseded by: none

## What changed
- Before: these three screens loaded once. My sessions "loads once when the profile opens; no live updates", so a player waiting for a join approval, or watching a club's **Happening now** chip, had to leave and come back.
- After: pulling the page down from its top (touch) refreshes the screen's data the same way as the session page (Queue log of the same date): **Pull to refresh** → **Release to refresh** → **Refreshing…** → **Updated 7:42 PM**. Once every 10 seconds; inside the lock a full pull shows **Refresh again in a few seconds**; offline it shows **You're offline. Reconnect and try again.** Coming back to the tab refreshes too. Nothing happens while a sheet is open.
- Scope: the leaderboard (the list, the signed-in player's own position, the match requirement), a club's page (the hero chip, Next up, Upcoming sessions, calendar, members), and the own profile (My sessions, Recent games, rank). A visitor's view of someone else's profile has no pull. No "Updated" bar is added to these screens; the pill's **Updated 7:42 PM** is the only time shown.

## Why
- Owner, November 12, 2026: "I want a scroll down to refresh page feature … or refresh feeds", then "do a complete implementation" after the sweep listed these screens as the Player app's lists that change while open. Extends the "pull down or tap Refresh, at most once every 10 seconds" rule of D-2026-11-09-04 from the session page to the Player app. No polling and no Realtime, per D-2026-11-09-09.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: pulling, armed, refreshing, done, locked, offline (same as the Queue log). Reduced motion: no slide transitions, the ring turns slowly.
- Copy: Pull to refresh; Release to refresh; Refreshing…; Updated 7:42 PM; Refresh again in a few seconds; You're offline. Reconnect and try again.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `pull-to-refresh/` — from the Queue log of the same date; `leaderboard-list/`, `club-next-up-card/`, `club-calendar/`, `my-sessions-card/` unchanged
- Extends: none
- New: none
- Shares work with: 2026-11-12-queue-pull-to-refresh.md, 2026-11-12-admin-pull-to-refresh.md

## Docs updated
- Business logic: none needed (reads only; the My sessions rule of D-2026-11-09-04 is amended in profile.md to "loads when the profile opens, then on pull or tab return")
- Database design: none needed
- Screen docs: ranking-history.md (P-LEADERBOARD states), club-page.md (P-CLUB-PAGE), profile.md (My sessions)

## Real app work
- Built in the same branch as this log (`claude/friendly-darwin-oiae5f`), not through a ticket: `LeaderboardPage`, `ClubPage` and `PlayerProfile` (own only) wrapped in `PullToRefresh` with `useThrottledRefresh` (`refreshOnReturn`). Set `IN MOCK APP — PR #<m>` when it merges. Do not ticket.
