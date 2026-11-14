# Player app: games shown as a small badminton court

Status: IN MOCK APP — #822
Date: 2026-11-13
App: player
Mockup: apps/mockup/player-app/rotra-player.html › gameRow(g, who) (uses cmpCourtSVG); callers sessionBlock, recentGamesCard, SHEETS_SESSION; `.gm*` styles
Route: /player/players/<id>/games, /player/players/<id> (Recent games), the session matches dialog
Screen ID: P-MATCH-HISTORY
Artifact: https://claude.ai/artifact/NzmSBUkRihAY6Bx7QQE9DZ
Components: game-row (a thin wrapper on match-court's Player variant)
Supersedes: the text game row (W/L badge, “Doubles with …”, “vs …”, score)
Superseded by: none

## What changed
- Before: a W/L square, “Doubles with NAME”, “vs NAME and NAME”, and the score or “Winner recorded; score not entered” wrapping on the right.
- After: a small court (the Compare page's court art): the player and partner on the left, opponents on the right, each a face with the first name; the winning side lit with accent rings and a soft tint. Right column: format, Won / Lost chip (Not counted for partial games), score in mono or “No score” (tooltip). On phones the format, chip and score go on one line above the court. Fun/partial notes under the row.
- Unchanged: which games show, tabs, session grouping, sharing.

## Why
- Owner, November 13, 2026: “can we please update how we show games in player app · this looks so bad · it should show the avatars and name of their opponent and maybe show it like a badminton court”.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: won, lost, partial (not counted), fun; singles and doubles; with and without a score; own profile (“You”) and someone else's.
- Copy: “Won”, “Lost”, “Not counted”, “No score”, “Winner recorded; score not entered”.
- Tokens: none
- Known differences: opponent faces in the prototype are drawn from the name; the real app uses each player's picture and the profile privacy rules.

## Reuse plan
- Reuses as is: match-court (the one shared court: art, faces, net box; Queue and Player variants), avatar, chip.
- New: game-row, a thin mapping of a player game onto match-court's Player variant.

## Pass 2 (artifact comment, November 13, 2026: “I don't mind the court height might appear bigger · put the score and status in the middle of the pairs”)
- The court is taller (112 px; 100 px on phones) with 44 px faces (36 px on phones). The format, score (or “No score”) and Won / Lost / Not counted chip now sit in a small box on the net, between the two pairs, instead of a column on the right; the row is the court alone at every width.

## Pass 3 (artifact comment, November 13, 2026: “as always since there are avatars they should open a dialog”)
- Every face on a game court is a button (accessible name “NAME. View profile”, a ring on hover/focus) that opens the profile card: the full card for a ROTRA player (private players get the private card, as elsewhere), and for someone with no ROTRA profile a limited card with the default banner, the face, the name, a **Not on ROTRA yet** chip and “This player played as a guest and hasn't registered with ROTRA yet, so there's no profile to show.” Opening a card from the session matches dialog replaces that dialog.

## Pass 4 (artifact comment, November 13, 2026: “make the courts similar to how the courts look like in the queue app”)
- The court uses the Queue app's court art: solid court green (`--court`), white lines (`--court-line`), the dashed net; faces ringed in white (accent ring for the winning side), first names on dark pills; the format, score and result box on the net is a dark pill too. The soft win tint is gone (the green court carries the colour). About 124 px tall.

## Pass 5 (artifact comment, November 13, 2026, on your own Games page: “since it's your profile you can share your own games”)
- On your own Games page, Recent games and session matches dialog, each counted game has a small round share icon under the result on the net (“Share this game”), opening the share dialog titled **Share game** with that one game (both sides, score, result). Each session's **Share games** no longer waits for the club: it shows on every session, with “Share result opens once the club shares the Standings.” while results are unpublished; **Share result** still needs publication. Recorded in [D-2026-11-13-06](../mvp/decisions.md#d-2026-11-13-06).

## Pass 6 (artifact comment, November 13, 2026: “add share session performance”)
- Each session on your own Games page has **Share performance** before Share games, and the session matches dialog (own profile) has it in the footer. It opens the share dialog titled “Share performance” with one card: the session title, date · club, your counted record big (“2–1”) with “67% won”, then “My session”: Games, Won, Lost, and Standing “#N” once the club has published. Available before publication, like Share games.

## Pass 7 (artifact comment, November 13, 2026: “find a way for the center to be readable and not cramped”)
- The box on the net keeps only the score (22 px mono; “No score” 13 px) and the Won / Lost chip, in a wider dark box (at least 96 px). The format moved to a small dark pill in the court's top-left corner (DOUBLES, SINGLES) and the share icon to a dark round button in the top-right corner (own games). Court about 132 px tall. Also: published sessions now show **Share performance** too (before Share result and Share games).

## Pass 8 (artifact comment, November 13, 2026: “paginate to 3 sessions per page”)
- The Games page shows three sessions per page, newest first, with a pager at the bottom of the list: **Newer** · “Page N of M · K sessions” · **Older** (buttons disabled at the ends; the list scrolls back to its top on a page change). Switching tabs, filtering by a weekly-performance bar, or opening another player's games goes back to page 1. With the bar filter the empty state reads “No games match this filter.”
