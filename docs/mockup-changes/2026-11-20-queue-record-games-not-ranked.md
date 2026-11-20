# Queue app: Record games off records the games as usual; only their wins stay out of the leaderboards and win rate

Status: NEW
Date: 2026-11-20
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › session setup (Formats and mode, the review), Preparation and live Settings (Game rules), the Start session sheet, the console header and tabs, sheet `result`, Finishing, the session record (all tabs), the public session page; helpers `recordedOf()`, `NOT_RANKED`
Route: /queue/sessions/new (Formats and mode, Record games); /queue/sessions/s-tonight/preparation; /queue/sessions/s-tonight; /queue/history
Screen ID: Q-SETUP, Q-PREPARE, Q-CONSOLE, Q-MATCH-DONE, Q-FINALIZING, Q-RESULTS, Q-HISTORY, Q-PUBLIC-DETAILS
Artifact: none
Components: session-setup-form, session-setup-card, chip, notice, confirm-result-sheet, public-session-details
Supersedes: 2026-11-18-queue-record-games-option.md (what Off does; the switch itself is unchanged)
Superseded by: none

## What changed
- The **Record games** switch stays as it was: on the session form, on by default, fixed after Start.
- With the switch **off**, the session now runs exactly like a recorded one:
  - **Match done** asks for the winner and score as usual (the no-result "Finish match N?" sheet is removed).
  - The console has its **Leaderboard** and **Match History** tabs again.
  - **Finishing** runs all four steps, including Updating player records, and opens the result slides. Toast:
    "Session finished · player records updated, not ranked".
  - **Session record:** standings, How the night ran, W–L on Players and **Publish results** all work. A
    **Not ranked** chip sits next to Results published / private; Results and the Leaderboard show a notice.
  - **Public session page:** Leaderboard, awards and match history work as usual. Details shows a
    **Rankings · Not ranked** tile.
- **Only difference:** the session's wins don't count toward the ROTRA leaderboards (Top annual / monthly / weekly)
  or anyone's win rate (Player app side: [player log](2026-11-20-player-not-ranked-games.md)).
- Labels: "Off · no results kept" → "Off · not ranked"; the console chip "Not recorded" → "Not ranked".

## Why
- Owner, November 20, 2026: "when games are not recorded they are still gonna have leaderboards, the games will
  still be recorded but the wins will not be counted for the ranking"; then: "the only difference is those wins
  wont be part of the recorded wins for leaderboard, it wont affect the winrate". Keep the name **Record games**.
- Decision: D-2026-11-20-02 (replaces "run only, keep nothing" in D-2026-11-18-06).

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: switch on, off, read-only after Start; a live session with it off (Not ranked chip, Leaderboard and
  Match History tabs, the normal result sheet); Finishing; a finished session record with it off on each tab; the
  finished public page.
- Copy: "Results, standings, result slides and awards are kept, and wins count toward the ROTRA leaderboards and
  win rate."; "Games and results are recorded as usual, but wins don't count toward the ROTRA leaderboards or
  anyone's win rate."; "Off · not ranked"; "Not ranked"; "This session isn't ranked. Its games and results are
  recorded as usual, but its wins don't count toward the ROTRA leaderboards or anyone's win rate."; "Rankings" ·
  "Not ranked" · "Wins here don't count toward the ROTRA leaderboards or win rate."; "Session finished · player
  records updated, not ranked".
- Tokens: none
- Known differences: none

## Reuse plan
- Changes: session-setup-form (hint copy), session-setup-card and public-session-details (row/tile copy)
- Removes: the no-result variant of confirm-result-sheet
- Reuses as is: chip, notice
- Shares work with: 2026-11-18-queue-record-games-option.md (same switch; its real-mode build #976 must change),
  2026-11-20-player-not-ranked-games.md

## Docs updated
- Business logic: queue/modules/sessions/README.md (Record games), queue/modules/results/README.md,
  player-information/modules/ranking/README.md
- Database design: matches-queue.md, results-publication.md, sessions-roster.md, offline-sync.md, open-decisions.md
  (all as **proposed**). Migration `20261120000100_record_games_ranks_only` written and checked on a local disposable database only; not on the shared database.
- Screen docs: session-setup.md, session-console.md, match-control.md, session-finalization.md,
  results-sharing.md, public-session.md (a note that D-2026-11-20-02 replaces the Off behavior)
- Decision: D-2026-11-20-02

## Real app work
- Mock app: undo the Off branches from #973 / #975 (console tabs, result sheet, finishing, session record, public
  page); keep the switch.
- Real mode (`packages/db`): Match done on an unrecorded session stores the winner and score; finishing runs as for
  any session; the leaderboard, win-rate and rank reads skip facts from sessions with `record_games = false`. The migration
  `20261120000100_record_games_ranks_only` is written (local only; shared database needs sign-off).
