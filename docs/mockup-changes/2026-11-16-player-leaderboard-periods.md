# Player app: three leaderboards (Top annual, Top monthly, Top weekly) with movement marks

Status: IN MOCK APP — #891 (PR #946)
Evidence: #897, #902, #906, #913 and #918 implemented and verified. [screenshots/891](../../screenshots/891/README.md).
Date: 2026-11-16
App: player
Mockup: apps/mockup/player-app/rotra-player.html › viewBoard, `periodList`, `lbMove`, `lbRow`, `lbHead`, `podium`, `meCard`, `.lb-move`, `.lb-wins`, `.lb-tabs`
Route: /player (Leaderboard)
Screen ID: P-LEADERBOARD, P-PUBLIC-PROFILE, P-OWN-PROFILE, P-COMPARE, profile dialog, share images
Artifact: https://claude.ai/artifact/FhosJSGnngPse4r1xGj6jN
Components: leaderboard-row, leaderboard-podium, your-position-card, segmented-control, profile-ranking-card, profile-leaderboard-chips, club-member-profile-sheet, compare-stats, profile-share-card, rank-share-card
Supersedes: none
Superseded by: none

## What changed
- Before: one overall list ordered by rank; each row showed place, picture, name and skill label.
- After: a switch **Top annual · Top monthly · Top weekly** under the page head, with the period and what it is compared with beside it. The podium, "Your position" card, search and list follow the chosen period.
- Each row: place, a **movement mark**, picture, name, then "N wins" with the win rate and skill label under it. The list heading's last column reads "Wins".
- Movement mark: an up arrow with the number of places, a down arrow with the number, a dash for no move, or a **New** pill. Hovering or focusing the row shows a tooltip with the earlier place.
- "Your position" card: "Your position this month", the place and wins, and the movement sentence.
- "Who appears here" gains two lines on the three lists and the mark.
- The page label reads "ROTRA leaderboards"; the intro reads "One list across every club. Most wins this year comes first. Singles and doubles count together."
- The numbers are made up in the prototype. The annual list keeps the earlier order, so positions on profiles don't change.

- **Owner, same day (follow-up):** each list shows the **top 50 only**, and a row shows the **number of wins only**: no skill level and no win rate on the row, the podium or the position card. The list footer reads "Showing 1–25 of the top 50" with Show 25 more. The podium caption reads "Top annual · 2026 · top 50". A signed-in player below the top 50 sees "You're not in the top 50 this year" with "87 wins this year. The player in place 50 has 93." Search covers the top 50: "No one in the top 50 matches “…”." The intro reads "The top 50 across every club. Most wins this year comes first. Singles and doubles count together."

- **Prototype control (owner request, same day):** Prototype panel › Leaderboard › "My place on the leaderboard (signs in as Migs)" with As played · In the top 50 · Not in the top 50. It signs in as Migs, opens the leaderboard and puts him at #17 or below place 50 on all three lists. When his wins equal place 50's, the card adds "and a better win rate".

- **Owner answers, same day (profiles and who is listed):**
  - The lists are just by wins: every player with a standard match in the period can be listed; the 10-match rule no longer decides it. "Who appears here" is rewritten, with "Each list starts again when a new year, month or week begins."
  - A profile names no overall position. The "Leaderboard ranking" / "Leaderboard eligibility" card is replaced by a card with the shared rank and, titled "Leaderboards", one box per list the player is in the top 50 of ("Top annual", "#17", "106 wins this year"); a box opens that list on the player's row. Nothing when they are in none (`lbBoxes`, `topPlaces`, `lbGo`).
  - The same places show as chips ("Top annual #39") in the profile dialog and an unclaimed player's card, as rows named after the lists in Compare, and as "Top annual" on share images (left out when there is no place).
  - Rank status text no longer mentions the leaderboard: Provisional reads "This rank is still settling: 7 of 10 standard matches in the last three months."; Needs reassessment reads "Last played more than three months ago, so this rank is out of date. A club gives NAME a fresh assessment to bring it up to date."

## Why
- Owner, November 16, 2026: "leaderboards should be top annual, top monthly, top weekly. there should also be top or bottom icons if player has recently ranked up or ranked down or show \"new\". hovering on icon should show tooltip if when was that person's place before?"
- Owner choices the same day: ordered by wins in the period; Top annual replaces the overall list; compared with the previous period. Decision: [D-2026-11-16-05](../mvp/decisions.md#d-2026-11-16-05).

- Owner, November 16, 2026 (follow-up): "we should make leaderboards to be top 50 only and should not show the skill level for now just show # of wins".

- Owner, November 16, 2026 (answers): "profile should not say it if it doesnt qualify for top 50. and should show if 3 boxes if qualified for each category"; "it is just by wins. and calendars roll".

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: each of the three lists; up, down, no move, New; a masked private row; an unclaimed row; signed in (position card) and signed out; search results; empty period; loading; error.
- Copy:
  - "Top annual" · "Top monthly" · "Top weekly"
  - "2026 · compared with last year" · "November 2026 · compared with last month" · "Nov 16 to Nov 22 · compared with last week"
  - Tooltips: "Up 3 places. Was #7 last week." · "Down 2 places. Was #5 last month." · "Same place as last year: #4." · "New on the weekly list. Not on it last week."
  - "N wins" (one: "1 win"); nothing under it
  - "Your position this year / this month / this week"
  - "No one on the leaderboard has played a standard match this week yet."
  - Who appears here: "Top annual, Top monthly and Top weekly each order those players by wins in standard matches in that year, month or week. Win rate breaks a tie. A player with no standard match in the period isn't on that list." · "The mark beside a place shows the move since the period before: up, down, or New when the player wasn't on that list then. Point at it to see their earlier place."
- Tokens: none new (up uses `--accent`, down `--error`, New the warn chip colours, the tooltip `--fg` on `--bg`).
- Known differences: The mock app dates follow its October 27 fixture clock. The HTML prototype dates
  follow the viewer's current calendar. The mock app's empty period and no-matches position card use
  the period copy above and omit the prototype's old skill-rank status. Always private profile
  dialogs follow D-2026-11-11-11 even though the HTML prototype makes every masked spot inert.
  The mock app's Prototype controls sign in as Jose, the app's fixture account.

## Reuse plan
- Reuses as is: segmented control, chip colours, podium, position card.
- Extends: leaderboard-row — the movement mark and the wins column; leaderboard-podium and your-position-card — wins and the period.
- New: a small tooltip on the movement mark (no tooltip component exists in the mockup).
- Shares work with: none.

## Docs updated
- Business logic: docs/business_logic/product/player-information/modules/ranking/README.md — the rules for the three lists.
- Database design: [Period leaderboards](../database_design/product/player-information/modules/ranking.md#period-leaderboards), approved November 18. Both periods use existing finalized match facts.
- Screen docs: docs/screens/product/modules/player-information/ranking-history.md — P-LEADERBOARD, skill-rank progress and share cards; docs/screens/product/modules/player-information/profile.md — profile boxes, the profile dialog and Compare.

## Real app work
- apps/player and packages/ui: the period switch, row, podium and position card as above.
- packages/data and packages/db: wins per period and the previous period's place for each list. The owner confirmed the calendar boundaries and tie order on November 18, 2026. Previous standings are computed from the original playing dates, including late-synced results. Skill-rank progress is separate.
