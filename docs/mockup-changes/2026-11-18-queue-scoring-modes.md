# Queue app: a scoring mode per session, and a match result dialog that asks only for what the mode needs

Status: TICKETED — #944
Date: 2026-11-18
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › session setup (part "Formats and mode" and the review), Preparation › Setup card, the console header, the playing-match sheet, sheet `result` (both steps), Match history on the console record and on the public finished-session page, the public session page › Details, the Start session sheet; helpers `SCORING`, `scoringOf()`, `resultCheck()`, `scoreEntry()`, `scoreParts()`, `seedScore()`
Route: /queue/sessions/new (Formats and mode, Scoring); /queue/sessions/s-tonight/preparation (Setup card); /queue/sessions/s-tonight (console: header chip, a match, Match done); public session page › Details; /queue/history (finished session record, Match history)
Screen ID: Q-SETUP, Q-PREPARE, Q-CONSOLE, Q-MATCH-DONE, D-WINNER, Q-HISTORY, P-SESSION
Artifact: none
Components: match-result-form, confirm-result-sheet, session-setup-form, session-setup-card, active-match-sheet, match-history, public-match-history, public-session-details, game-row, segmented-control, switch, choice-group, key-value-list
Supersedes: none
Superseded by: none

## What changed
- **Session setup › Formats and mode** gets a **Scoring** field after **Mode**: five choices (label in bold, the
  rule under it), **16/31** selected by default. Once the session has started the field is read-only.
- One table drives everything:

  | Label | Text under the label | Target | Games | Deuce |
  |---|---|---|---|---|
  | 16/31 | One game to 31. Change sides at 16. Deuce at 30–30. | 31 | 1 | yes |
  | 16/31, no deuce | One game to 31. Change sides at 16. The first to 31 wins. | 31 | 1 | no |
  | 11/21 | One game to 21. Change sides at 11. Deuce at 20–20. | 21 | 1 | yes |
  | 11/21 × 3 | Best of 3 games to 21. Change sides at 11. Deuce at 20–20. | 21 | 3 | yes |
  | 21 × 3 | Best of 3 games to 21. Change sides after each game. No deuce: the first to 21 wins. | 21 | 3 | no |

- A session saved before this change has no scoring mode and reads as 16/31.
- **Scoring · <label>** shows on the Preparation Setup card, the console header, the playing-match sheet line,
  the public session page › Details, the Start session sheet, the setup review and the finished-session Details.
- **Match N result, one game** (the three one-game modes). Before: Pick the winner, OR, two free score boxes.
  After: **Pick the winner** is required. Until it is picked the area shows only a hint. Once picked, the
  winner's side shows the fixed score (Team A · 31) and one box asks for the losing score. In the deuce modes a
  **Went to deuce** switch turns the area into two boxes to type by hand; turning it off restores the single
  box. **Clear score** shows once anything is typed.
- **Match N result, best of 3** (11/21 × 3, 21 × 3). Pick the winner stays on top (picking only the winner still
  works), then OR, then **Enter each game**: Game 1, Game 2, and Game 3 only when games 1 and 2 were split. Each
  row has a Team A / Team B pick for who won the game, the fixed winning score and the losing-score box. In
  11/21 × 3 each row also has a **Deuce** toggle that turns it into two boxes. Above the rows, the games won
  and the winner. The top pick follows the games; picking the other team by hand is refused.
- **Refused, not warned:** a score the mode cannot produce (31–31, a loser's 31 with no deuce, 31–30, a score
  whose higher side is not the picked winner, a missing game score) stays on the sheet with an inline message.
  A winner-only result still confirms.
- **Confirm match result** shows `31–24 (Team A–Team B)`, or `2–1 · 21–18, 15–21, 21–19 (Team A–Team B)`, or
  "No score entered".
- **Match history** (console record and public finished-session page) shows the same: one score, or `2–1` in the
  score box with every game score in a small pill on its own line under the match-time pill, or "No score". The public view flips every game score when the viewer played on
  Team B.
- Stored on the prototype match: `scoreA` / `scoreB` for one game; for best of 3 `games: [{ a, b }]` with
  `scoreA` / `scoreB` holding the games won. Old matches with only `scoreA` / `scoreB` still show.
- Seed data follows each session's mode (winners score 31 in a 16/31 session). Sunday Night Queue (finished)
  uses 11/21 × 3; the live example uses the default.

## Why
- Owner, November 18, 2026: the Queue Master picks the session's scoring mode in preparation and the match
  result dialog then asks only for what that mode needs. On the layout: "you can have a play on how you want to
  display it here".
- Owner answers, November 18, 2026: mockup first; best of 3 keeps **every game score**; deuce has **no cap**
  (the first pair to lead by 2 wins: 32–30, 33–31, ...); scores the mode cannot produce are **refused**.
- Open (conservative default used): the mode cannot change after Start. Epic: #944.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: setup with each of the five choices selected; setup read-only after Start; result sheet before a
  winner is picked; one game with the winner picked and the losing box empty, filled, and in error; deuce
  switch on with two boxes (valid, invalid, wrong winner); best of 3 with no game picked, one game, 2–0 (two
  rows), 2–1 (three rows), the games disagreeing with the top pick, a row with a missing score; the review
  step with a score, with game scores and with no score; history rows with a single score, with game scores and
  with "No score"; an older saved session without a scoring mode.
- Copy:
  - Setup: field "Scoring"; hint "How games are scored tonight. The match result dialog asks only for what this needs."; read-only hint "Scoring can't change after Start."
  - Mode labels and texts as in the table above
  - Display rows: "Scoring" (key), "Scoring · 16/31" (console header chip), "· Scoring · 16/31" (playing-match sheet line), "Fixed after start"
  - Result, one game: "Pick the winner", "Pick the winner first. The score is optional.", "Team A · 31", "<loser names> scored (optional)", "Game to 31. Enter the losing score, or leave it empty." (21 for 11/21), "Went to deuce", "30–30 and on: the first to lead by 2 wins." (20–20 for 21), "Deuce at 30–30: the first to lead by 2 wins. Type both scores." (20–20 for 21), "Clear score", "Review result"
  - Result, best of 3: "OR", "Enter each game", "Game 1", "Game 2", "Game 3", "Deuce", "Team A", "Team B", "Team A scored", "Team B scored", "Games won · Team A 2 – 1 Team B", "Winner: Team A · <names>", "Best of 3 to 21. The first pair to win 2 games wins. Scores are optional.", "Clear scores"
  - Errors: "Pick the winner."; "Enter the losing score as a whole number from 0 to 29." (30 for 16/31, no deuce; 19 for 11/21; 20 for 21 × 3); "At 30–30 the game goes to deuce. Turn on Went to deuce and type both scores." (20–20 for 21; "Turn on Deuce for this game and type both scores." on a best of 3 row, prefixed "Game 2: "); "A deuce game ends when one pair leads by 2, like 32–30." (22–20 for 21); "The score says Team B won, but Team A is picked. Fix one of them."; "The games say Team A won, but Team B is picked. Fix one of them."; "Enter a score for every game played, or clear them all."; "Pick who won each game. One pair must win 2 games to decide the match."
  - Review and history: "31–24 (Team A–Team B)", "2–1 · 21–18, 15–21, 21–19 (Team A–Team B)", "No score entered", "No score"
- Tokens: none (existing tokens only)
- Known differences: none

## Reuse plan
- Reuses as is: segmented-control — the Team A / Team B pick on each game row; switch — Went to deuce and the row Deuce toggle; choice-group — the five Scoring choices; key-value-list — the Scoring rows; notice — unchanged
- Extends: match-result-form — scoring mode prop (target, games, deuce), the single losing-score box, the Went to deuce switch, game rows, the games-won line and the mode's refusals
- Extends: confirm-result-sheet — the score line with game scores
- Extends: session-setup-form — the Scoring field and its read-only state
- Extends: session-setup-card, active-match-sheet, public-session-details — a Scoring row or line
- Extends: match-history, public-match-history, game-row — game scores in the top-strip pill beside `2–1`, flipped with the teams
- New: none
- Shares work with: none

## Docs updated
Done in #956 (November 18, 2026):
- Business logic: [matches](../business_logic/product/queue/modules/matches/README.md) (score rules per mode, deuce, best of 3, refusal), [sessions](../business_logic/product/queue/modules/sessions/README.md) (Scoring setting), [open decisions](../business_logic/product/open-decisions.md).
- Database design (proposal only): [matches and queue](../database_design/product/queue/modules/matches-queue.md), [sessions and roster](../database_design/product/queue/modules/sessions-roster.md), [results publication](../database_design/product/queue/modules/results-publication.md), [open decisions](../database_design/product/open-decisions.md).
- Screen docs: [match control](../screens/product/modules/queue/match-control.md), [session setup](../screens/product/modules/queue/session-setup.md), [session console](../screens/product/modules/queue/session-console.md), [public session](../screens/product/modules/queue/public-session.md), [results and history](../screens/product/modules/queue/results-sharing.md), [dialogs](../screens/product/dialogs.md), [open decisions](../screens/product/open-decisions.md).
- Terms and decisions: [product terms](../product-terms.md), [D-2026-11-18-04](../mvp/decisions.md#d-2026-11-18-04).

## Real app work
- `@rotra/ui`: the forms and sheets above, with stories for every mode and refusal.
- `@rotra/data` and `apps/queue`: a `scoring` value on the session (default 16/31 for old sessions) and
  `games` on a match; the refusal rule as one shared function. The stored shape of a best-of-3 score needs the
  owner's go-ahead before any database change (#944).
- Real mode: store and read both with the session and the match record.
