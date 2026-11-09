# Request a match: six format pills, gated by a session setting

Status: NEW
Date: 2026-11-09
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Public session page › Request a match; Session setup › Formats and mode; Preparation › Setup card; Requests › Match
Route: /queue/s/s-tonight (View as: present) › Request a match; /queue/prepare
Screen ID: Q-PUBLIC-DETAILS (My night › Request a match), Q-SETUP-FORM, Q-REQUESTS
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: match-request-sheet, segmented-control, session-setup-form, key-value-list, match-request-card
Supersedes: none
Superseded by: none

## What changed
- Request a match always shows a **Format** pill row: **2 v 2** (default), **1 v 1**, **1 v 2**, **3 v 3**, **4 v 4**, **5 v 5**. A pill the session does not allow is disabled (greyed, struck through, tooltip “Not allowed for requests in this session”) with the hint “Greyed formats aren't open for requests in this session.” The court draws as many spots as the format needs (partners under You on the left, opponents on the right; 4 v 4 and 5 v 5 on a taller court). With no format allowed, the button toasts “This session isn't taking match requests”.
- Session setup › Formats and mode gets a **Players can request** pill row with the same six formats (pressed = allowed) and the hint “Which kinds of games a signed-in player can ask for with Request a match. Greyed pills on their side are the ones you leave off here.” New sessions: 2 v 2 on, 1 v 1 follows the Singles switch, fun formats off. Sessions saved before this change behave the same way until edited.
- The Setup card shows a **Requests** row: “Players can request 2 v 2, 1 v 1” or “Players can't request matches”.
- Requests › Match cards say “NAME asks for a 2 v 2 doubles match” and list one line per spot the format needs; Add to queue fills every Anyone spot the same way for every size.
- Data: a request stores `partners[]` (one per partner spot) instead of a single `partner`.

## Why
- Owner comment on the published artifact, November 9, 2026: “should pick 2 v 2 (default), 1 v 1, 1 v 2, 3 v 3, 4 v 4, 5 v 5; those pills will be disabled if queue disallows that (make sure queue setting has that option to toggle which kind of games are allowed to request)”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: all six allowed; some disabled; none allowed (toast); each format's court with empty and picked spots; the setup pill row with none on (extra hint line); Setup card row both wordings; a 3 v 3 request card on the QM side.
- Copy: as quoted under What changed.
- Tokens: none new (`.seg`, `.hint`, court tokens).
- Known differences: the defaults (2 v 2 on, 1 v 1 tied to Singles, fun formats off until switched on) and the pill wording “2 v 2” beside the product's “Doubles” are prototype decisions; the owner's comment gave only the list and the default. Owner to confirm.

## Reuse plan
- Reuses as is: `segmented-control/`, `key-value-list/`, `court-pitch/`
- Extends: `match-request-sheet/` (format pills with disabled state, spots per format), `session-setup-form/` (Players can request row), `match-request-card/` (spots per format)
- New: none
- Shares work with: 2026-11-09-queue-match-request-court, 2026-11-09-queue-player-match-request

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/matches/README.md — Match request, player and QM side
- Database design: docs/database_design/product/queue/modules/sessions-roster.md — `request_formats`; docs/database_design/product/queue/modules/matches-queue.md — `match_requests.partner_session_player_ids`
- Screen docs: docs/screens/product/modules/queue/public-session.md — Request a match sheet; docs/screens/product/modules/queue/session-setup.md — Formats and mode, Match tab
- Terms: docs/product-terms.md — Match request

## Real app work
- `request_formats` on the session with the setup row and projection; the sheet's pill row and per-format spots; `partners[]` on match requests; Add to queue for every size.
