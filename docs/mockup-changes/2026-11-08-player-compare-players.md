# Compare yourself with another player

Status: NEW
Date: 2026-11-08
App: player
Mockup: apps/mockup/player-app/rotra-player.html › another player's profile › Compare with me, and the new compare page
Screen ID: P-COMPARE (new)

## What changed
- New button **Compare with me** in the hero of any other player's profile. Signed out, it asks you to sign
  in and then opens the comparison.
- New page “You and NAME”: level, overall position, games counted and win rate side by side; a head-to-head
  win count with a bar; the number of games on the same team and how many were won; and a list of every
  shared game with who won, the score, the teams, the date, session and club.
- Only counted singles and doubles are included.
- Each shared game is one row of three columns, 40% / 30% / 30% (owner comment, same day): the court with both
  teams on their sides of the net (picture with a game-count badge, green ring on the winners, first name and
  skill level under each picture), the session info (date, title, club), and the result (win or lose label with
  the score under it). Because the court is only 40% wide, the players on each side are stacked vertically.
- Owner comment on the artifact, November 8, 2026: compare my standing to a different player, see how many
  wins and losses I have against them, and the games we both played together and who won.

- The filter switch (**All**, **Head to head**, **Together**, each with its count) sits at the top of the page, and
  the numbers follow it: games, wins and win rate for both players, plus a record bar. The separate “Head to
  head” card is gone (owner comments, same day).
- The shared games list is paginated, three per page, with **‹ Older** on the left, a “4–6 of 8” counter and **Newer ›** on the right
  (owner comment, same day).

- **Head to head** shows the full side-by-side comparison (level, position, games counted, overall win rate, and
  the wins and win rate in the games against each other). **Together** has its own layout: a team card with
  both pictures, Games / Won / Lost tiles, a team win rate and a bar (owner comment, same day).

## Open questions for the owner
- Assumed: only signed-in players can compare, and any profile can be compared. Should a player be able to
  turn this off for their own profile? (These are results already shown on profiles.)
- Assumed: fun and partial games are left out. Should they appear as their own line?
- The prototype generates the shared games from the two ids; the real feature needs player-linked match
  rows (who played, on which team, the score). Check the database design before building.

- The court graphic has a transparent background; only its lines and outline remain, in the green accent at 10%
  opacity, and names and levels use the normal text colors, so they read clearly in light and dark (owner
  comments, same day).

## Backend note
- Owner comment, same day: this will be a background Supabase Edge Function / cron, but check whether a cron is
  needed at all, because there should be no extra work after a session is submitted. Recommendation recorded in
  the docs: no cron; read the shared games from final match rows, or update a pair summary when the session is
  finalized. Nothing was built; Edge Functions and cron need an owner decision (AGENTS.md rule 11).

## Docs updated
- Business logic: none yet; pending the questions above
- Database design: docs/database_design/product/open-decisions.md — proposal row for how compare data is produced (no cron by default)
- Screen docs: docs/screens/product/modules/player-information/profile.md — new P-COMPARE section
