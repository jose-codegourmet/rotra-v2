# Requests · N with Join and Match tabs: ROTRA-player hints, drop-out notices, match request cards

Status: IN MOCK APP — #586
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation › Requests card; Live session › Requests · N button › Requests sheet
Route: /queue/sessions/s-tonight/preparation
Screen ID: Q-PREPARE (Requests card), Q-CONSOLE (Requests · N), Q-ROSTER
Artifact: none
Components: join-requests-panel, join-request-card, tabs, sheet, notice, chip, list-row, button, level-select
Supersedes: none
Superseded by: none

## What changed
- Every **Join requests · N** button (live console header, live Overview actions) is now **Requests · N**, where N = pending join requests + open drop-out notices + open match requests. It opens a sheet **Requests** with two tabs, **Join · N** and **Match · N**. The preparation page's inline card is the same panel with the title “Requests · N” and the intro “Join requests, drop-out notices and match requests from the session page. Nothing changes until you act on one.”; it shows while anything is waiting. Counts arrive with the existing refresh; no extra request UI.
- **Join tab**: a sub-list **Can't make it · N** at the top (“The slot stays until you remove the player.”) with one row per open drop-out notice: picture, name, “Says they can't make it · 7:20 PM”, **Remove from roster** and **Keep**. Below it **Join requests · N** (heading only while drop-outs show) with the existing request rows.
- **Join request card** for a signed-in ROTRA player: the `Guest request` chip becomes **ROTRA player · already in your club** (ok) or **ROTRA player · new to your club** (warn); the meta line is “Requested 6:54 PM”; a muted hint “Shared rank: Intermediate Mid” (or “none yet”); “Invited by Miguel Santos” when the request carried a Session invite code. The QM still picks the level and taps **Decline** / **Confirm** (guests keep **Confirm guest**; **Confirm to waitlist** when full). Confirming a player new to the club saves them as a registered saved player marked “Joined via session link”.
- **Guest request matching a saved player by phone**: a notice inside the card, “Is this Kiko Salazar from your saved players?” with **Link** (toast “Linked to Kiko Salazar”, the notice then reads “Linked to Kiko Salazar from your saved players.”; confirming gives that saved player the slot) and **Not them** (hides the prompt). Seeded on Sunday Night Queue: Rhea Villanueva (in club, invited by Migs), Paolo Reyes (new to the club), Kiko Salazar (guest matching saved player p19).
- **Match tab**: one card per open match request: “Miguel Santos asks for a doubles match”, “Requested 7:21 PM”, then a line per spot (Requester, Partner, Opponent) with picture, name, “3 of 4 games · Advanced Low” and “· On Court 2” / “· In queue #1”, or “Anyone · Partner” with “Filled from present players with the fewest games”. **Decline** (toast “Migs's match request declined”) and **Add to queue** (primary): a waiting match at the end of the Main Queue, protected like a manual match, Anyone spots filled from present players not named, fewest games (played + queued) first; toast “Match added to the queue”; if the spots can't be filled, toast “Not enough present players to fill this doubles match”. Empty tab: “No match requests. Present players can ask for a match from the session page.” Requests close by themselves (hidden) when anyone named stops being present; Session done closes the rest.

## Why
- D-2026-11-09-02 (“ROTRA player · already in your club” / “new to your club”, shared rank hint), D-2026-11-09-03 (drop-out notices under Requests; the slot frees only when the QM removes the player), D-2026-11-09-05 (“One **Requests · N** button with **Join** and **Match** tabs … **Add to queue** … or **Decline**”; closing rules), D-2026-11-09-06 (“Is this <name> from your saved players?” … **Link** once), D-2026-11-09-08 (“Invited by <name>”).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: card hidden when nothing waits; Join tab with and without drop-outs; join card for guest / in-club player / new-to-club player / invited player; phone-match notice, linked notice; Match tab with named and Anyone spots, On Court / In queue lines; empty Match tab; sheet from the live console (same tabs, **Done** footer); level missing error; slots full (“Confirm to waitlist”).
- Copy: “Requests · N”; “Requests”; “Join requests, drop-out notices and match requests from the session page. Nothing changes until you act on one.”; “Join · N”; “Match · N”; “Can't make it · N”; “The slot stays until you remove the player.”; “Says they can't make it · 7:20 PM”; “Remove from roster”; “Keep”; toasts “NAME removed from the roster”, “NAME stays on the roster”; “Join requests · N”; “Check each one is a real person you expect (ask at the door, or match their name and phone) before confirming. Oldest first.”; “Slots are full, so confirmed players go on the waitlist.”; “ROTRA player · already in your club”; “ROTRA player · new to your club”; “Requested 6:54 PM”; “Shared rank: Intermediate Mid”; “Shared rank: none yet”; “Invited by Miguel Santos”; “Is this NAME from your saved players?”; “Link”; “Not them”; toast “Linked to NAME”; “Linked to NAME from your saved players.”; “Confirm”; “No join requests waiting.”; “Anyone who opens the session link can ask for a slot; they show up here.”; “NAME asks for a doubles match”; “Requested 7:21 PM”; “· Requester” / “· Partner” / “· Opponent”; “3 of 4 games · Advanced Low”; “· On Court 2”; “· In queue #1”; “Anyone”; “Filled from present players with the fewest games”; “Decline”; “Add to queue”; toast “Match added to the queue”; toast “Not enough present players to fill this doubles match”; toast “NAME's match request declined”; “No match requests. Present players can ask for a match from the session page.”
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: `tabs/` (Join | Match), `sheet/`, `notice/`, `chip/`, `list-row/`, `button/`, `level-select/`, `avatar/`
- Extends: `join-requests-panel/` (tabs, drop-out sub-list, match request list, empty states); `join-request-card/` (ROTRA-player variant with chip, shared-rank hint, invited-by line, link prompt)
- New: `drop-out-notice-row/` and `match-request-card/` — nothing in `packages/ui/src/components/` lists a player lineup with per-player games/level/where lines plus two actions; say so in the ticket if `match-card/` can take a `request` variant instead
- Shares work with: 2026-11-09-queue-player-match-request, 2026-11-09-queue-player-self-check-in, 2026-11-09-queue-public-signed-in-names-join, 2026-11-09-queue-session-invite, 2026-11-09-queue-guest-linking

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/players/README.md — QM side of join requests, drop-out handling, guest linking; docs/business_logic/product/queue/modules/matches/README.md — “Match request, QM side”
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `session_drop_out_notices.decision`, join-request linking fields; docs/database_design/product/queue/modules/matches-queue.md — `match_requests` statuses (`added`) and decisions
- Screen docs: docs/screens/product/modules/queue/session-setup.md — Requests card; docs/screens/product/modules/queue/session-console.md — Requests · N; docs/product-terms.md — Match request, Drop-out notice, Requests · N, Session invite

## Built
- #616 (epic #586): Requests · N with Join and Match tabs in the mock app. Real mode does not read or decide requests yet.

## Real app work
- Requests sheet and card with tabs in `apps/queue`; `match_requests` and `session_drop_out_notices` reads and QM decisions (Add to queue creates the waiting match; Remove from roster releases the slot); join-request hints from `player_id`, `invite_code_id` and the server's phone suggestion; counts in the existing session refresh.
