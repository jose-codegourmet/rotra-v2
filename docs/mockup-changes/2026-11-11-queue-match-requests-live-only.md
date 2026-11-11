# Requests: join requests before Start, match requests after; the live console shows Match requests at the upper right

Status: NEW
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation › Requests card (and the Requests sheet)
Route: /queue/sessions/s-tonight/preparation
Screen ID: Q-PREP (Requests), D-2026-11-09-05
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: requests-panel, tabs
Supersedes: none
Superseded by: none

## What changed
- Before: the Requests card on the preparation page showed **Join · N** and **Match · 0** tabs before Start; on the live console a **Requests · N** button sat at the end of the actions row and only when something was waiting; the public page kept offering **Request to join** after Start.
- After: no tabs anywhere. Before Start the Requests card lists join requests and drop-out notices only (intro: “Join requests and drop-out notices from the session page. Nothing changes until you act on one.”). At Start every pending join request is closed (the Start toast adds “· N join requests closed”) and the public page shows “The session has started, so online join requests are closed. Ask the Queue Master at the venue to add you.” instead of Request to join. On the live console a **Match requests · N** button sits at the **upper right** of the header, always visible, and turns the warn colour (bold) while any match request is waiting; it opens the Requests sheet, which lists match requests only (intro: “Match requests from players on the session page. Nothing changes until you act on one.”). The Overview card's row says **Match requests · N** too.

## Why
- Owner comments on the Queue artifact, November 11, 2026: “this doesn't make sense because the game hasn't started yet, there shouldn't be match requests” and “should be located upper right, noticeable color if there are match requests, since the session started there shouldn't be any join requests anymore”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: preparation with join requests, preparation with none, live console with 0 match requests (plain button, upper right), live console with waiting match requests (warn-coloured button), Requests sheet on the live console, public page after Start (closed card, for visitors and signed-in players).
- Copy: **Join requests and drop-out notices from the session page. Nothing changes until you act on one.**; **Match requests from players on the session page. Nothing changes until you act on one.**; **Match requests · N**; **The session has started, so online join requests are closed. Ask the Queue Master at the venue to add you.**; Start toast suffix **· N join requests closed**.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: requests-panel, tabs
- Extends: requests-panel (tabs only while live)
- New: none
- Shares work with: none

## Docs updated
- Business logic: `docs/business_logic/product/queue/modules/sessions/README.md` › Starting (join requests end at Start); `modules/players/README.md` › Join requests from the session link (overrides the during-play parts of D-2026-11-11-02) and QM side; `docs/business_logic/product/open-decisions.md` (Queue rows).
- Database design: `docs/database_design/product/queue/modules/sessions-roster.md` › `session_join_requests` (Start closes pending requests as `closed`; none created after Start; no new field).
- Screen docs: `docs/screens/product/modules/queue/session-setup.md` › Requests card (no tabs), Q-START toast; `docs/screens/product/modules/queue/session-console.md` › Q-CONSOLE header (Match requests at the upper right, three live controls and a More menu); `docs/screens/product/modules/queue/public-session.md` › Q-PUBLIC-JOIN (closed notice after Start).

## Real app work
- `@rotra/ui` RequestsPanel: render the Match tab and count match requests only when the session status is active.

## Owner comment, November 11, 2026 (third): "can we rearrange the buttons and layout here?"
- Changed: the live console header no longer has a six-button row under the title. The title block sits on the left; on the right (wrapping under the title on narrow screens) is one compact cluster: **Match requests · N** (warn-coloured while waiting), **Courts and time**, **Payments**, and a **⋯** More menu (same pattern as the preparation page's More menu) holding **Public page**, **Copy Facebook post**, **Session settings** and **Home**. Nothing was removed; the four less frequent actions moved into the menu.
- Copy: **More for this session** (menu label). No other new strings.
- States added: More menu open and closed; Esc and tapping outside close it.
