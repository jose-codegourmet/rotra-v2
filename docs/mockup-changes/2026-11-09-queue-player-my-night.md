# Session page: My night card, refresh bar, Courts now and own standing

Status: IN MOCK APP — #585 (Q17.14, #603)
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › refresh bar, My night card, Details › Courts now, Results
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-DETAILS, Q-PUBLIC-RESULTS (My night)
Artifact: none
Components: card, button, chip, match-card, standings-slide, public-session-details
Supersedes: none
Superseded by: none

## What changed
- A thin bar under the hero on `/s/<slug>`: “Updated 7:42 PM · Refresh”, plus “· Venue changes haven't synced yet” when changes are pending. Refresh is disabled for 10 s after a tap (tooltip “Refresh again in a few seconds”); only data refreshes, rendered in place.
- **My night** card (confirmed signed-in player) above the Details / Participants tabs, by stage: before start “Confirmed · starts DATE, TIME” + I can't make it; present “3 of 6 games played · 2W 1L” then “In queue #3 · with A vs B, C” or “Not in a queued match”, with **Request a match** and **I'm leaving**; on court “You're on Court 2 · with A vs B, C”, highlighted; at the minimum “6 of 6 · Minimum reached”, above it “7 games · minimum 6”; finished “Session finished · 7 games · 4W 3L” with a **Match history** link. Waitlisted: “Waitlist #N · you get a slot if one opens”.
- Details tab, signed in, live: **Courts now** tiles (court label, format chip, players' names per the name rule, “Started 7:31 PM” or “Getting ready”; empty court “Free”) before the read-only **Queue**.
- Own standing only: no other player's results during the session; after publish, the published Standings with the viewer's row highlighted (accent-subtle background); unpublished “Results for this session have not been shared.”

## Why
- D-2026-11-09-04 (owner discussion, November 9, 2026): “player view is never live.”; My night above the tabs, Courts now and Queue inside Details, no new tab.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: refresh enabled / disabled / pending changes; My night at each stage above; Courts now with busy, getting-ready and free courts; results published (own row highlighted) and unpublished.
- Copy: as listed under What changed, plus “Courts now”, “Free”, “Getting ready”, “Started HH:MM”, “Match history”.
- Tokens: none
- Known differences: “Confirmed · starts DATE, TIME”, “Getting ready”, “Waitlist #N · you get a slot if one opens” and the “Checked in” line are prototype copy not in the decision; owner to confirm.

## Reuse plan
- Reuses as is: `card/`, `button/`, `chip/`, `key-value-list/`
- Extends: `standings-slide/` (highlighted row prop); `match-card/` or `public-session-queue/` (Courts now tile: started time, Free); `public-session-details/` (refresh bar slot)
- New: `my-night-card/` — stage-driven card with its own lines and actions; nothing existing carries player-side actions
- Shares work with: 2026-11-09-queue-player-self-check-in, 2026-11-09-queue-player-match-request, 2026-11-09-queue-session-invite

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — #569 note pointing to D-04
- Database design: none needed (read projections only)
- Screen docs: docs/screens/product/modules/queue/public-session.md — Signed-in Player section

## Real app work
- Signed-in projection endpoint (own standing, courts now, queue, refresh time, pending flag) with the 10 s client throttle and refresh on tab focus; My night card wiring in `apps/queue`.
