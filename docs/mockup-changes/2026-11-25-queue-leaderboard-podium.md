# Queue leaderboards get the ROTRA Player podium, and a Leaderboards page joins the left nav

Status: NEW
Date: 2026-11-25
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › `podiumHtml`, `sessionPodium`, `boardPane` (console Leaderboard tab), `histResultsPane` (record › Results), `pubLeaderboard` (public page › Leaderboard), sheet `podiumPlace`, `viewLeaderboards`, `navRail`
Route: /queue/leaderboards (and `?tab=rotra`); /queue/sessions/s-tonight?tab=board; /queue/sessions/x-full/record; /queue/sessions/x-full/public-page (Leaderboard tab)
Screen ID: Q-LEADERBOARDS, Q-PODIUM-PLACE, Q-LEADERBOARD, Q-HISTORY, Q-PUBLIC-RESULTS
Artifact: none
Components: top-three-podium, live-leaderboard, session-standings, standings-faces, leaderboard-list, leaderboard-row, leaderboard-move, leaderboard-period-switch, leaderboard-rules-card
Supersedes: none
Superseded by: none

## What changed
- **One podium for every Queue leaderboard** (`podiumHtml`), copied from the ROTRA Player leaderboard podium: the
  “Top three” card lit from below in the accent with an 8 px grid and drifting ember pixels, pixel-notched steps
  (2nd–1st–3rd), the pixel font (Silkscreen, added to the Queue mockup's font link) and pixel fire behind 1st.
  - Before: a podium only on ROTRA Player, showing exactly three single players. After: the podium **always shows**.
    A place with no one yet keeps its step with an empty dashed circle and “—”; with no one in 1st there is no fire.
  - A **shared place** stacks its pictures on the step (up to three; past three, two and a “+N” bubble), reads
    the first two names and “+N more” with the record line ending in “each”, and opens the new **Podium place** dialog.
  - A one-player place opens that player's profile (club profile sheet; on the public page the profile card for a
    signed-in player only).
- **Podium place dialog** (new): “2nd place · 3 players”, a muted line (“Same wins and losses: 2 W and 1 L each.” or
  “Same wins and win rate: 6 wins and 67% each this month.”), one row per player (picture, full name, club on the ROTRA
  board, “W W · L L · G games · P% win rate”), **Close**. A row opens the profile; the profile's back button reads
  **Back to place** and returns to the dialog.
- **Console Leaderboard tab**: before, the copy then the standings table. After, one leaderboard for the current
  session only: copy, the podium (“This session · N players”, steps “3 W · 1 L”), then the unchanged table (all
  positions, 1–3 included). Its rules are unchanged (most wins, then fewest losses; same wins and losses share a
  position, numbered 1, 1, 2; the Not ranked notice).
- **Session record › Results** and **public page › Leaderboard**: the same session podium above their standings
  tables (they use the same standings).
- **Public page › Leaderboard**: names and pictures are no longer masked in the podium, the dialog or the standings
  table (before: masked for visitors, guests and always-private players).
- **New Leaderboards page** (`/queue/leaderboards`), a left-nav item with a trophy icon after Saved players: underline
  tabs **Club** and **ROTRA**; period buttons **Top annual**, **Top quarterly**, **Top monthly**, **Top weekly** with the
  period and “compared with last …”; the podium (“Top monthly · November 2026 · top 50”, steps “N wins”); a card with
  places 4 to 50 (place, movement mark up / down / – / New with its tooltip, picture, full name, club on ROTRA, “N wins”,
  “P% win rate”); a “Who appears here” card. Places: most wins, win rate breaks a tie; same wins and same win rate share
  a place, numbered 1, 1, 2. Periods are calendar periods in Manila time. Prototype data is made up from player IDs;
  other clubs' players are made up; shared podium places are pinned in Club › Top monthly / Top weekly and ROTRA › Top
  quarterly / Top weekly.

## Why
- Owner, November 25, 2026 ([D-2026-11-25-04](../mvp/decisions/2026-11-25.md#d-2026-11-25-04)): “a leaderboard in the
  queue page should look like this too”; “the session leaderboards should be one only. and it is for the current
  session”; “I want the leaderboards to always show the PODIUM”; “multiple people can be in the podium per place as
  long as it is stacked”; “if multiple people are in a place of the podium. clickin it should open a dialog on who's in
  that place”. Leaderboards always show the full name and picture. A Leaderboards page in the Queue app with Club and
  ROTRA boards, each with annual, quarterly, monthly and weekly lists.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: podium with three single places; a shared place (2, 3, and more than 3 players, “+N”); fewer than three
  places (empty steps); no games yet (three empty steps above “No completed games yet. Standings appear after the first
  confirmed result.”); hover and focus on a podium place (name underline, brighter step, focus ring); reduced motion (no
  embers, still fire); Podium place dialog with tappable rows (Queue Master, signed-in player) and plain rows (visitor,
  other club's player); profile opened from the dialog with **Back to place**; Leaderboards page on each board and
  period; list empty (“No one has won a standard match this month yet. The list fills as your sessions finish.” /
  “… as clubs finish sessions.”) and all-on-podium (“Everyone on this list is on the podium.”); movement tooltip on
  hover and focus; long names wrapping.
- Copy: “Top three”; “This session · N player(s)”; “W W · L L”, “N win(s)”, “… each”; “+N more”; “1st” “2nd” “3rd”;
  “2nd place · N players”; “Same wins and losses: W W and L L each.”; “Same wins and win rate: N wins and P% each this
  week / this month / this quarter / this year.”; “No one is in this place now.”; “Back to place”; “Leaderboards”;
  “Club”, “ROTRA”; “Top annual”, “Top quarterly”, “Top monthly”, “Top weekly”; “2026” / “Q4 2026 · Oct 1 to Dec 31” /
  “November 2026” / “Nov 23 to Nov 29” “· compared with last year / quarter / month / week”; “The top 50 in CLUB's
  sessions.” / “The top 50 across every club on ROTRA.” “Most wins in standard matches this … comes first. Singles and
  doubles count together.”; “#”, “Player”, “Wins”; “N win(s)”, “P% win rate”; movement words as on ROTRA Player (“Up 2
  places. Was #6 last month.”, “New on the monthly list. Not on it last month.”); the five or six “Who appears here”
  lines as in the mockup.
- Tokens: none new. The podium uses existing tokens (`--accent`, `--on-accent`, `--surface`, `--elev`, `--border`,
  `--border-strong`, `--fg2`, `--warn`, `--error`) and the Player mockup's `--pixel` font stack (“Silkscreen”).
- Known differences: none.

## Reuse plan
- Reuses as is: leaderboard-move — the Leaderboards page's movement marks; leaderboard-period-switch — extended
  below; leaderboard-row — the Leaderboards page's rows from place 4.
- Extends: top-three-podium (the ROTRA Player podium, moving to `@rotra/ui`) — accepts places with several players
  (stacked pictures, “+N”), empty places, a record-line slot (“3 W · 1 L” or “N wins”) and an `onPlace` handler that
  opens the dialog for a shared place; leaderboard-period-switch — a fourth option, Top quarterly; leaderboard-row — an
  optional club line and win rate; live-leaderboard and session-standings — render the podium above the table;
  leaderboard-rules-card — the Club / ROTRA lines.
- New: podium-place-dialog — nothing lists the players of one shared place today; leaderboards page container (Queue
  route `/leaderboards`) with Club / ROTRA tabs.
- Shares work with: the same day's Player leaderboard changes (podium stacking and full names) if they touch
  top-three-podium; 2026-11-19-queue-leaderboard-rings (the table's level rings stay).

## Docs updated
- Business logic: none here; the rules (session leaderboard scope, period boards, shared places, full names) are
  recorded by the parallel business-docs change for D-2026-11-25-04.
- Database design: none needed for the mockup; club / ROTRA period boards will need a query design when ticketed.
- Screen docs: queue/leaderboards.md (new: podium, Q-PODIUM-PLACE, Q-LEADERBOARDS), queue/README.md (module row),
  queue/session-console.md (Q-LEADERBOARD podium), queue/results-sharing.md (Results tab podium),
  queue/public-session.md (Leaderboard tab podium, no masking), navigation.md (Queue nav item and module row).

## Real app work
- `@rotra/ui`: extend top-three-podium (shared, empty, record line, place handler) with stories in both themes and
  `.meta.ts`; new podium-place-dialog; period switch with Top quarterly; leaderboard-row club line and win rate.
- `apps/queue`: podium on the console Leaderboard tab, the session record's Results tab and the public page's
  Leaderboard tab (unmasked names there); new `/leaderboards` route with Club / ROTRA tabs and four periods, and the
  left-nav item.
- `packages/data`: mock club and ROTRA period boards (annual, quarterly, monthly, weekly; Manila calendar periods;
  dense shared places) and their hooks.
