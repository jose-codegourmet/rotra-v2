# Session page: players check themselves in, leave, and say they can't make it

Status: TICKETED — #585
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › My night card (I'm here, I'm leaving, I can't make it)
Route: /queue/s/s-tonight
Screen ID: Q-PUBLIC-JOIN (My night)
Artifact: none
Components: button, card, notice
Supersedes: none
Superseded by: none

## What changed
- Before: presence was operator-only; a confirmed player's page had nothing to tap.
- After, confirmed signed-in player on a live session who is not present: one large full-width **I'm here** button (44 px). Tapping sets Present on the roster with a “checked in themselves” mark (`selfCheckedIn`), and the card says “Checked in”, or “Checked in · the QM will see it when their device syncs” when the prototype is offline.
- Present: **I'm leaving** turns Present off and the card says “You've left · tap I'm here if you come back” with **I'm here**.
- Before start: **I can't make it** writes a drop-out notice (`s.dropOuts`) and the card says “Told the QM you can't make it”; the slot stays.
- Guests: no card; the status card gains “Register to check in and see your matches.”
- Finishing a session closes open drop-out notices, match requests and join requests (kept in state, hidden).

## Why
- D-2026-11-09-03 (owner discussion, November 9, 2026): self check-in is a tap only; the QM's last action wins; players never take or release slots themselves.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: not present (I'm here); checked in online; checked in offline; left; before start with and without the notice; guest nudge.
- Copy: “I'm here”; “Checked in”; “Checked in · the QM will see it when their device syncs”; “I'm leaving”; “You've left · tap I'm here if you come back”; “I can't make it”; “Told the QM you can't make it”; “Register to check in and see your matches.”; toasts “Checked in”, “Told the QM you're leaving”, “Told the QM you can't make it”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `button/`, `card/`, `notice/`, `toaster/`
- Extends: the new My night card (see 2026-11-09-queue-player-my-night); `roster-row/` and `roster-card/` get the “checked in themselves” mark (QM side, separate log/ticket)
- New: none
- Shares work with: 2026-11-09-queue-player-my-night

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — Presence › Self check-in, I'm leaving, I can't make it
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_players.self_checked_in_at`, `left_at`; `session_drop_out_notices`
- Screen docs: docs/screens/product/modules/queue/public-session.md — Signed-in Player › My night

## Real app work
- Player-side writes (check-in, leave, drop-out notice) with the roster-link check; club setting to turn self check-in off; QM roster mark and undo; Requests shows drop-out notices.
