# Queue app: a Record games switch per session; off runs the night and keeps no results

Status: TICKETED — #961
Date: 2026-11-18
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › session setup (part "Formats and mode" and the review), Preparation › Setup card, the console header and tabs, sheet `result`, the Start session sheet, Finishing, the session record (all tabs), the public session page; helpers `recordedOf()`, `NOT_RECORDED`
Route: /queue/sessions/new (Formats and mode, Record games); /queue/sessions/s-tonight/preparation; /queue/sessions/s-tonight; /queue/history
Screen ID: Q-SETUP, Q-PREPARE, Q-CONSOLE, Q-MATCH-DONE, Q-FINALIZING, Q-HISTORY, Q-PUBLIC-DETAILS
Artifact: none
Components: session-setup-form, session-setup-card, switch, chip, notice, confirm-result-sheet, public-session-details
Supersedes: none
Superseded by: 2026-11-20-queue-record-games-not-ranked.md (what Off does: games are recorded as usual; only their wins stay out of the leaderboards and win rate)

## What changed
- **Session setup › Formats and mode** gets a **Record games** switch after Scoring, on by default. Once the
  session has started it is a read-only On / Off chip.
- **Record games · On / Off · no results kept** shows on the setup review, the Preparation Setup card ("Fixed
  after start" once live) and the Start session sheet. The console header shows a **Not recorded** chip.
- With the switch **off**:
  - **Match done** opens "Finish match N?" with the two teams and no winner or score. The match ends with no
    result and still counts toward each player's games.
  - The console has no **Leaderboard** tab.
  - **Finishing** runs two steps (Checking session records, Finishing the session), then opens the session
    record instead of the result slides. Toast: "Session finished · games not recorded".
  - **Session record:** a **Not recorded** chip instead of Results published / private. Results and How the
    night ran show a notice. Public page has no Publish results button. Players shows games against the minimum
    without W–L. Financials is unchanged.
  - **Public session page:** Details shows a Results row; once finished there is no Leaderboard tab, no awards,
    and Match history reads "This session's games were not recorded."
- A session saved before this change has no value and reads as recorded.

## Why
- Owner, November 18, 2026: "add a feature where the QM has the option record the session games or not. but the
  default is recorded".
- Owner answers, November 18, 2026: off means **run only, keep nothing**; the switch is on the **session form,
  until start**.
- Open (conservative defaults used): see D-2026-11-18-06.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: switch on (default), off, read-only after Start; a live unrecorded session; a finished unrecorded
  session record on each tab; the finished public page for a visitor and a signed-in player.
- Copy: "Record games"; "Results, standings, result slides and awards are kept, and games count toward player
  records."; "Games aren't recorded: Match done asks for no result. The queue, courts and minimum games still
  work, but there are no standings, result slides or awards, and nothing goes to player records or rankings.";
  "Record games can't change after Start."; "Off · no results kept"; "Not recorded"; "Finish match N?";
  "Games aren't recorded in this session, so no result is entered. The game still counts toward each player's
  games."; "This session's games were not recorded. It has no results, standings, result slides or awards, and it
  doesn't count toward player records or rankings."; "There is no match history or replay."; "Not recorded · No
  results, standings or awards for this session."; "Session finished · games not recorded".
- Tokens: none
- Known differences: none

## Reuse plan
- Extends: session-setup-form — a Record games switch (default on, read-only after Start)
- Extends: session-setup-card, public-session-details — one more row
- Extends: confirm-result-sheet — a no-result variant
- Reuses as is: switch, chip, notice
- Shares work with: 2026-11-18-queue-scoring-modes.md (the same form part, cards and result sheet)

## Docs updated
- Business logic: docs/business_logic/product/queue/modules/sessions/README.md — new Record games section;
  results/README.md — an unrecorded session has no standings, slides or awards
- Database design: `queue_sessions.record_games` in docs/database_design/product/queue/modules/sessions-roster.md,
  matches-queue.md (no-result decision) and results-publication.md (what finishing writes); migration
  `20261119000100_session_record_games` (Q23.8 #976): applied to a local disposable database 2026-11-19; **applied to the shared database 2026-11-19** (`prisma db execute` + `migrate resolve`; `20261114000400_sign_in_tables` held then, applied to the shared database 2026-11-23)
- Screen docs: none yet; the screens follow when the open points in D-2026-11-18-06 are answered
- Decision: D-2026-11-18-06

## Real app work
- The session form, setup card, console (Match done, tabs), finishing, the session record and the public page
  in `apps/queue` and `@rotra/ui`; a stored field and the finish path in `packages/db` (migration: ask first).
