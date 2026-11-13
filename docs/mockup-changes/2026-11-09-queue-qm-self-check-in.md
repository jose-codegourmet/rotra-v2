# Roster: “Checked in themselves” mark, and the club setting Players can check themselves in

Status: IN MOCK APP — #586
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Roster and levels rows and cards, Live session › Players cards; Club settings › Session defaults
Route: /queue/sessions/s-tonight/preparation?tab=roster · /queue/club-settings/session-defaults
Screen ID: Q-ROSTER, Q-POOL, Q-CLUB (Session defaults)
Artifact: none
Components: roster-row, roster-card, player-pool-card, switch, session-defaults-panel, list-row
Supersedes: none
Superseded by: none

## What changed
- Roster rows (list), roster cards (grid) and the live Players cards show, under the presence text or switch, a small muted line with the check icon: “✓ Checked in themselves · 7:21 PM” while the player's own **I'm here** stands, and “Left · 7:21 PM” after their **I'm leaving** until the QM or the player sets Present again. The QM's presence switch works as before; the QM's last action wins: turning Present off (or Mark all absent) clears the mark, turning it on (or Mark all present) clears Left, and a later self check-in shows a new mark. Queue tiles show nothing.
- Club settings › Session defaults gains a switch row **Players can check themselves in** (default on) with the helper “During a live session, confirmed ROTRA players can tap I'm here on the session page. Turn it off and only you mark presence.” Off hides the player-side **I'm here** button; the session page's My night card says “Ask the Queue Master to mark you present.” instead. Toasts: “Players can check themselves in” / “Only you mark presence now”.

## Why
- D-2026-11-09-03: “The QM's roster shows a small ‘checked in themselves’ mark and the QM can undo it. The club can turn self check-in off.” … “The QM's last action wins. A self check-in made after the QM turned Present off shows as a new check-in with the mark.”

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: row and card with the mark; with “Left · TIME”; neither (plain presence); mark after the QM toggles Present off then the player checks in again; switch on and off; My night without the I'm here button.
- Copy: “Checked in themselves · 7:21 PM”; “Left · 7:21 PM”; “Players can check themselves in”; “During a live session, confirmed ROTRA players can tap I'm here on the session page. Turn it off and only you mark presence.”; “Ask the Queue Master to mark you present.”; toasts “Players can check themselves in”, “Only you mark presence now”.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `switch/`, `list-row/` (the settings row), `icon/` (check)
- Extends: `roster-row/`, `roster-card/`, `player-pool-card/` (a `selfCheckIn` / `leftAt` caption under presence); `session-defaults-panel/` (the switch row)
- New: none
- Shares work with: 2026-11-09-queue-player-self-check-in, 2026-11-09-queue-qm-requests-tabs

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — self check-in mark, undo, club setting
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_players.self_checked_in_at` / `left_at` clearing rules (already listed); club setting to add to `clubs` when ticketed
- Screen docs: docs/screens/product/modules/queue/players-roster.md — self check-in mark; docs/screens/product/modules/queue/access-home.md — Session defaults switch; docs/product-terms.md — Self check-in

## Built so far
- #617 (roster rows and cards, live Players cards): the Checked in themselves / Left mark is in the mock app. The club setting **Players can check themselves in** belonged to epic Q19 (#587); Q19 is closed and the setting is in the mock app (Club settings › Session defaults, My night card).

## Real app work
- Roster and pool components read `selfCheckedInAt` / `leftAt`; presence writes clear them server-side; a `clubs.self_check_in_enabled` setting read by the Player-side I'm here guard.
